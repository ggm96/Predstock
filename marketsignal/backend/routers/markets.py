import asyncio
import time
from typing import Optional
from fastapi import APIRouter, Query
from models import MarketWithInstruments, PredictionMarket
from services import kalshi, polymarket, manifold, metaculus
from services.prices import fetch_instruments
from services import claude_mapper

router = APIRouter()

_markets_cache: Optional[tuple[list[MarketWithInstruments], float]] = None
CACHE_TTL = 600  # 10 minutes

_source_status: dict[str, dict] = {
    "kalshi": {"online": False, "count": 0, "error": None, "last_fetch": None},
    "polymarket": {"online": False, "count": 0, "error": None, "last_fetch": None},
    "manifold": {"online": False, "count": 0, "error": None, "last_fetch": None},
    "metaculus": {"online": False, "count": 0, "error": None, "last_fetch": None},
}


async def _fetch_source(name: str, fn) -> list[PredictionMarket]:
    try:
        markets = await fn()
        _source_status[name]["online"] = True
        _source_status[name]["count"] = len(markets)
        _source_status[name]["error"] = None
        _source_status[name]["last_fetch"] = time.time()
        return markets
    except Exception as e:
        _source_status[name]["online"] = False
        _source_status[name]["error"] = str(e)
        _source_status[name]["last_fetch"] = time.time()
        return []


async def _load_all_markets() -> list[MarketWithInstruments]:
    all_raw = await asyncio.gather(
        _fetch_source("kalshi", kalshi.fetch_markets),
        _fetch_source("polymarket", polymarket.fetch_markets),
        _fetch_source("manifold", manifold.fetch_markets),
        _fetch_source("metaculus", metaculus.fetch_markets),
    )

    all_markets: list[PredictionMarket] = []
    for batch in all_raw:
        all_markets.extend(batch)

    # Enrich with Claude classification where API key is available
    claude_results = await claude_mapper.classify_markets(all_markets)
    if claude_results:
        enriched: list[PredictionMarket] = []
        for market in all_markets:
            override = claude_results.get(market.id)
            if override:
                data = market.dict() if hasattr(market, "dict") else market.model_dump()
                data["category"] = override["category"]
                if override["tickers"]:
                    data["related_tickers"] = override["tickers"]
                market = PredictionMarket(**data)
            enriched.append(market)
        all_markets = enriched

    # Fetch price data for all unique tickers
    all_tickers = list({t for m in all_markets for t in m.related_tickers})
    instruments_map = {i.ticker: i for i in await fetch_instruments(all_tickers)}

    result: list[MarketWithInstruments] = []
    for market in all_markets:
        instruments = [instruments_map[t] for t in market.related_tickers if t in instruments_map]
        result.append(MarketWithInstruments(market=market, instruments=instruments))

    return result


async def get_all_markets() -> list[MarketWithInstruments]:
    global _markets_cache
    now = time.time()
    if _markets_cache and now - _markets_cache[1] < CACHE_TTL:
        return _markets_cache[0]
    markets = await _load_all_markets()
    _markets_cache = (markets, now)
    return markets


@router.get("/markets", response_model=list[MarketWithInstruments])
async def list_markets(
    source: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    min_probability: Optional[float] = Query(None, ge=0, le=1),
    max_probability: Optional[float] = Query(None, ge=0, le=1),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
):
    markets = await get_all_markets()

    if source:
        markets = [m for m in markets if m.market.source == source.lower()]
    if category:
        markets = [m for m in markets if m.market.category == category.lower()]
    if min_probability is not None:
        markets = [m for m in markets if m.market.probability >= min_probability]
    if max_probability is not None:
        markets = [m for m in markets if m.market.probability <= max_probability]
    if search:
        q = search.lower()
        markets = [
            m for m in markets
            if q in m.market.title.lower() or q in m.market.question.lower()
        ]

    return markets[:limit]


@router.get("/health")
async def health():
    return {
        "sources": _source_status,
        "cache_age": time.time() - _markets_cache[1] if _markets_cache else None,
    }

import asyncio
import time
from datetime import datetime, timezone
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


def _is_active(m: PredictionMarket) -> bool:
    if not m.close_date:
        return True  # trust the source API's own open/closed filter
    try:
        dt = datetime.fromisoformat(m.close_date.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt > datetime.now(timezone.utc)
    except Exception:
        return True


async def _apply_claude_enrichment(
    cached: list[MarketWithInstruments],
    raw_markets: list[PredictionMarket],
) -> list[MarketWithInstruments]:
    """Classify with Claude and return enriched list. Runs as background task."""
    global _markets_cache
    try:
        claude_results = await claude_mapper.classify_markets(raw_markets)
        if not claude_results or not _markets_cache:
            return cached

        # Collect any new tickers Claude found
        new_tickers = {
            t
            for r in claude_results.values()
            for t in r.get("tickers", [])
        }
        existing_tickers = {i.ticker for mwi in cached for i in mwi.instruments}
        missing = list(new_tickers - existing_tickers)
        extra_instruments = {i.ticker: i for i in await fetch_instruments(missing)}
        all_instruments = {i.ticker: i for mwi in cached for i in mwi.instruments}
        all_instruments.update(extra_instruments)

        enriched: list[MarketWithInstruments] = []
        for mwi in cached:
            override = claude_results.get(mwi.market.id)
            if override:
                tickers = override.get("tickers") or []
                cat = override.get("category", "other")
                if not tickers:
                    cat = "other"
                data = mwi.market.dict() if hasattr(mwi.market, "dict") else mwi.market.model_dump()
                data["category"] = cat
                data["related_tickers"] = tickers
                data["ticker_rationales"] = override.get("ticker_rationales") or {}
                market = PredictionMarket(**data)
                instruments = [all_instruments[t] for t in tickers if t in all_instruments]
                enriched.append(MarketWithInstruments(market=market, instruments=instruments))
            else:
                enriched.append(mwi)

        _markets_cache = (enriched, _markets_cache[1])
        return enriched
    except Exception:
        return cached


async def _load_all_markets() -> list[MarketWithInstruments]:
    all_raw = await asyncio.gather(
        _fetch_source("kalshi", kalshi.fetch_markets),
        _fetch_source("polymarket", polymarket.fetch_markets),
        _fetch_source("manifold", manifold.fetch_markets),
        _fetch_source("metaculus", metaculus.fetch_markets),
    )

    all_markets: list[PredictionMarket] = [m for batch in all_raw for m in batch]
    all_markets = [m for m in all_markets if _is_active(m)]

    all_tickers = list({t for m in all_markets for t in m.related_tickers})
    instruments_map = {i.ticker: i for i in await fetch_instruments(all_tickers)}

    result: list[MarketWithInstruments] = [
        MarketWithInstruments(
            market=m,
            instruments=[instruments_map[t] for t in m.related_tickers if t in instruments_map],
        )
        for m in all_markets
    ]

    asyncio.create_task(_apply_claude_enrichment(result, all_markets))

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
    limit: int = Query(500, ge=1, le=500),
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

import asyncio
import time
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Query
from models import MarketWithInstruments, PredictionMarket
from services import kalshi, polymarket, manifold, metaculus
from services import claude_mapper

router = APIRouter()

_markets_cache: Optional[tuple[list[MarketWithInstruments], float]] = None
CACHE_TTL = 86400  # 24 hours — fetch markets once per day

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
        return True
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
) -> None:
    """Ask Claude which markets relate to a specific company. Updates cache in place."""
    global _markets_cache
    try:
        claude_results = await claude_mapper.classify_markets(raw_markets)
        if not claude_results or not _markets_cache:
            return

        enriched: list[MarketWithInstruments] = []
        for mwi in cached:
            result = claude_results.get(mwi.market.id)
            if result and result.get("company"):
                data = mwi.market.model_dump() if hasattr(mwi.market, "model_dump") else mwi.market.dict()
                data["company"] = result["company"]
                if data["category"] == "other":
                    data["category"] = "equities"
                enriched.append(MarketWithInstruments(market=PredictionMarket(**data)))
            else:
                enriched.append(mwi)

        _markets_cache = (enriched, _markets_cache[1])
    except Exception:
        pass


async def _load_all_markets() -> list[MarketWithInstruments]:
    all_raw = await asyncio.gather(
        _fetch_source("kalshi", kalshi.fetch_markets),
        _fetch_source("polymarket", polymarket.fetch_markets),
        _fetch_source("manifold", manifold.fetch_markets),
        _fetch_source("metaculus", metaculus.fetch_markets),
    )

    all_markets: list[PredictionMarket] = [m for batch in all_raw for m in batch]
    all_markets = [m for m in all_markets if _is_active(m)]

    result = [MarketWithInstruments(market=m) for m in all_markets]

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


FINANCIAL_CATEGORIES = {"macro", "equities", "crypto", "politics", "commodities", "rates"}


@router.get("/markets", response_model=list[MarketWithInstruments])
async def list_markets(
    source: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    min_probability: Optional[float] = Query(None, ge=0, le=1),
    max_probability: Optional[float] = Query(None, ge=0, le=1),
    search: Optional[str] = Query(None),
    limit: int = Query(5000, ge=1, le=5000),
):
    markets = await get_all_markets()

    markets = [m for m in markets if m.market.category in FINANCIAL_CATEGORIES]

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

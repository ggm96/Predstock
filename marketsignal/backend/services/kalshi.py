import httpx
from models import PredictionMarket
from services.mapper import map_market_to_tickers, categorise_market

BASE_URL = "https://api.elections.kalshi.com/trade-api/v2"

CATEGORY_MAP = {
    "ECON": "macro",
    "FIN": "equities",
    "CRYPTO": "crypto",
    "POL": "politics",
    "COMMODITIES": "commodities",
    "RATES": "rates",
}


MAX_MARKETS = 500


async def fetch_markets() -> list[PredictionMarket]:
    markets_raw = []
    cursor = None

    async with httpx.AsyncClient(timeout=30) as client:
        while len(markets_raw) < MAX_MARKETS:
            params = {"limit": 1000, "status": "open"}
            if cursor:
                params["cursor"] = cursor
            resp = await client.get(f"{BASE_URL}/markets", params=params)
            resp.raise_for_status()
            data = resp.json()
            page = data.get("markets", [])
            markets_raw.extend(page)
            cursor = data.get("cursor")
            if not cursor or not page:
                break

    markets_raw = markets_raw[:MAX_MARKETS]

    result: list[PredictionMarket] = []

    for m in markets_raw:
        try:
            ticker = m.get("ticker", "")
            title = m.get("title", "")
            yes_bid = m.get("yes_bid", 0)
            probability = float(yes_bid) / 100 if yes_bid else 0.5
            probability = max(0.0, min(1.0, probability))

            volume = m.get("volume", 0)
            volume_usd = float(volume) if volume else None
            close_time = m.get("close_time")

            kalshi_cat = m.get("category", "")
            category = CATEGORY_MAP.get(kalshi_cat, "other")

            tags: list[str] = []
            if m.get("tags"):
                tags = [str(t) for t in m["tags"]]

            question = m.get("subtitle", title)
            tickers = map_market_to_tickers(title, question, tags)
            if category == "other":
                category = categorise_market(title, tags, question)

            result.append(PredictionMarket(
                id=f"kalshi-{ticker}",
                source="kalshi",
                title=title,
                question=question,
                probability=probability,
                volume_usd=volume_usd,
                close_date=close_time,
                url=f"https://kalshi.com/markets/{ticker}",
                category=category,
                related_tickers=tickers,
                tags=tags,
            ))
        except Exception:
            continue

    return result

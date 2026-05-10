import httpx
from models import PredictionMarket
from services.mapper import map_market_to_tickers, categorise_market

BASE_URL = "https://api.manifold.markets/v0"


async def fetch_markets() -> list[PredictionMarket]:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{BASE_URL}/markets",
            params={"limit": 100, "sort": "liquidity"},
        )
        resp.raise_for_status()
        data = resp.json()

    result: list[PredictionMarket] = []

    for m in data:
        try:
            # Only binary markets
            if m.get("outcomeType") != "BINARY":
                continue

            question = m.get("question", "")
            if not question:
                continue

            probability = float(m.get("probability", 0.5))
            probability = max(0.0, min(1.0, probability))

            volume = m.get("volume")
            volume_usd = float(volume) if volume else None

            close_time_ms = m.get("closeTime")
            close_date = None
            if close_time_ms:
                from datetime import datetime, timezone
                close_date = datetime.fromtimestamp(
                    close_time_ms / 1000, tz=timezone.utc
                ).isoformat()

            url = m.get("url", f"https://manifold.markets/market/{m.get('id', '')}")

            tags_raw = m.get("tags", [])
            tags: list[str] = [str(t) for t in tags_raw] if tags_raw else []

            market_id = str(m.get("id", question[:40]))
            tickers = map_market_to_tickers(question, question, tags)
            category = categorise_market(question, tags)

            result.append(PredictionMarket(
                id=f"manifold-{market_id}",
                source="manifold",
                title=question,
                question=question,
                probability=probability,
                volume_usd=volume_usd,
                close_date=close_date,
                url=url,
                category=category,
                related_tickers=tickers,
                tags=tags,
            ))
        except Exception:
            continue

    return result

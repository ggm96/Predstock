import json
import httpx
from models import PredictionMarket
from services.mapper import map_market_to_tickers, categorise_market

BASE_URL = "https://clob.polymarket.com"


async def fetch_markets() -> list[PredictionMarket]:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{BASE_URL}/markets", params={"closed": "false", "limit": 100})
        resp.raise_for_status()
        data = resp.json()

    markets_raw = data if isinstance(data, list) else data.get("data", [])
    result: list[PredictionMarket] = []

    for m in markets_raw:
        try:
            question = m.get("question", "")
            if not question:
                continue

            # outcomePrices is a JSON string like '["0.73", "0.27"]'
            outcome_prices_raw = m.get("outcomePrices", "[]")
            if isinstance(outcome_prices_raw, str):
                outcome_prices = json.loads(outcome_prices_raw)
            else:
                outcome_prices = outcome_prices_raw

            probability = 0.5
            if outcome_prices and len(outcome_prices) > 0:
                try:
                    probability = float(outcome_prices[0])
                except (ValueError, TypeError):
                    probability = 0.5
            probability = max(0.0, min(1.0, probability))

            volume = m.get("volume")
            volume_usd = float(volume) if volume else None
            end_date = m.get("endDate")

            tags_raw = m.get("tags", [])
            tags: list[str] = []
            if isinstance(tags_raw, list):
                for t in tags_raw:
                    if isinstance(t, str):
                        tags.append(t)
                    elif isinstance(t, dict):
                        tags.append(t.get("label", t.get("slug", "")))

            market_id = str(m.get("condition_id", m.get("id", question[:40])))
            tickers = map_market_to_tickers(question, question, tags)
            category = categorise_market(question, tags)

            result.append(PredictionMarket(
                id=f"poly-{market_id}",
                source="polymarket",
                title=question,
                question=question,
                probability=probability,
                volume_usd=volume_usd,
                close_date=end_date,
                url=f"https://polymarket.com/market/{market_id}",
                category=category,
                related_tickers=tickers,
                tags=tags,
            ))
        except Exception:
            continue

    return result

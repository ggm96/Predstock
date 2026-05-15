import json
import httpx
from models import PredictionMarket
from services.mapper import categorise_market

BASE_URL = "https://clob.polymarket.com"
_END_CURSOR = "LTE="
MAX_MARKETS = 2000


async def fetch_markets() -> list[PredictionMarket]:
    markets_raw = []
    cursor = None

    async with httpx.AsyncClient(timeout=30) as client:
        while len(markets_raw) < MAX_MARKETS:
            params = {"closed": "false", "limit": 100}
            if cursor:
                params["next_cursor"] = cursor
            resp = await client.get(f"{BASE_URL}/markets", params=params)
            resp.raise_for_status()
            data = resp.json()
            page = data if isinstance(data, list) else data.get("data", [])
            markets_raw.extend(page)
            next_cursor = data.get("next_cursor") if isinstance(data, dict) else None
            if not next_cursor or next_cursor == _END_CURSOR or not page:
                break
            cursor = next_cursor

    markets_raw = markets_raw[:MAX_MARKETS]

    result: list[PredictionMarket] = []

    for m in markets_raw:
        try:
            question = m.get("question", "")
            if not question:
                continue

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
            if end_date and isinstance(end_date, str):
                end_date = end_date.replace(" ", "T")
                if not end_date.endswith("Z") and "+" not in end_date and "-" not in end_date[10:]:
                    end_date = end_date + "Z"

            tags_raw = m.get("tags", [])
            tags: list[str] = []
            if isinstance(tags_raw, list):
                for t in tags_raw:
                    if isinstance(t, str):
                        tags.append(t)
                    elif isinstance(t, dict):
                        tags.append(t.get("label", t.get("slug", "")))

            market_id = str(m.get("condition_id", m.get("id", question[:40])))
            category = categorise_market(question, tags, question)

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
                tags=tags,
            ))
        except Exception:
            continue

    return result

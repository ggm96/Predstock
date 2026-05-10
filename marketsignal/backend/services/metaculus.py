import httpx
from models import PredictionMarket
from services.mapper import map_market_to_tickers, categorise_market

BASE_URL = "https://www.metaculus.com/api2"


async def fetch_markets() -> list[PredictionMarket]:
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        resp = await client.get(
            f"{BASE_URL}/questions/",
            params={
                "type": "forecast",
                "status": "open",
                "order_by": "-activity",
                "limit": 50,
            },
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()

    questions = data.get("results", [])
    result: list[PredictionMarket] = []

    for q in questions:
        try:
            title = q.get("title", "")
            if not title:
                continue

            # community_prediction.full.q2 is the median
            community_pred = q.get("community_prediction") or {}
            full_pred = community_pred.get("full") or {}
            median = full_pred.get("q2")

            if median is None:
                continue  # Skip questions with no prediction yet

            probability = float(median)
            probability = max(0.0, min(1.0, probability))

            num_predictions = q.get("number_of_predictions", 0)
            volume_usd = float(num_predictions) if num_predictions else None

            close_time = q.get("close_time")
            page_url = q.get("page_url", "")
            if page_url and not page_url.startswith("http"):
                page_url = f"https://www.metaculus.com{page_url}"

            tags_raw = q.get("tags", [])
            tags: list[str] = []
            if isinstance(tags_raw, list):
                for t in tags_raw:
                    if isinstance(t, str):
                        tags.append(t)
                    elif isinstance(t, dict):
                        tags.append(t.get("name", ""))

            q_id = str(q.get("id", title[:40]))
            tickers = map_market_to_tickers(title, title, tags)
            category = categorise_market(title, tags)

            result.append(PredictionMarket(
                id=f"metaculus-{q_id}",
                source="metaculus",
                title=title,
                question=q.get("description", title)[:500] if q.get("description") else title,
                probability=probability,
                volume_usd=volume_usd,
                close_date=close_time,
                url=page_url or f"https://www.metaculus.com/questions/{q_id}/",
                category=category,
                related_tickers=tickers,
                tags=tags,
            ))
        except Exception:
            continue

    return result

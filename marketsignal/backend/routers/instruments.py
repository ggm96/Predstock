from fastapi import APIRouter
from routers.markets import get_all_markets

router = APIRouter()


@router.get("/instruments/summary")
async def instruments_summary():
    markets = await get_all_markets()

    ticker_data: dict[str, dict] = {}

    for mwi in markets:
        for instrument in mwi.instruments:
            t = instrument.ticker
            if t not in ticker_data:
                ticker_data[t] = {
                    "instrument": instrument,
                    "related_markets": [],
                }
            ticker_data[t]["related_markets"].append({
                "id": mwi.market.id,
                "title": mwi.market.title,
                "probability": mwi.market.probability,
                "source": mwi.market.source,
            })

    return [
        {
            "instrument": v["instrument"],
            "related_markets": v["related_markets"],
            "market_count": len(v["related_markets"]),
        }
        for v in sorted(ticker_data.values(), key=lambda x: len(x["related_markets"]), reverse=True)
    ]

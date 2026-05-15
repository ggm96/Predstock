from pydantic import BaseModel
from typing import Optional


class PredictionMarket(BaseModel):
    id: str
    source: str  # "kalshi" | "polymarket" | "manifold" | "metaculus"
    title: str
    question: str
    probability: float  # 0 to 1
    volume_usd: Optional[float] = None
    close_date: Optional[str] = None
    url: str
    category: str  # "macro"|"equities"|"crypto"|"politics"|"commodities"|"rates"|"other"
    tags: list[str] = []
    company: Optional[str] = None


class MarketWithInstruments(BaseModel):
    market: PredictionMarket

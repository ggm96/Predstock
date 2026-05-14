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
    related_tickers: list[str] = []
    tags: list[str] = []
    rationale: Optional[str] = None
    ticker_rationales: Optional[dict] = None


class FinancialInstrument(BaseModel):
    ticker: str
    name: str
    price: float
    change_pct: float
    currency: str
    market_cap: Optional[float] = None
    sector: Optional[str] = None


class MarketWithInstruments(BaseModel):
    market: PredictionMarket
    instruments: list[FinancialInstrument]

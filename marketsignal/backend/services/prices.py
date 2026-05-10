import asyncio
import time
from typing import Optional
import yfinance as yf
from models import FinancialInstrument

_cache: dict[str, tuple[FinancialInstrument, float]] = {}
CACHE_TTL = 300  # 5 minutes


def _fetch_ticker_sync(ticker: str) -> Optional[FinancialInstrument]:
    try:
        t = yf.Ticker(ticker)
        info = t.info
        hist = t.history(period="2d")

        if hist.empty or len(hist) < 1:
            return None

        price = float(hist["Close"].iloc[-1])
        change_pct = 0.0
        if len(hist) >= 2:
            prev = float(hist["Close"].iloc[-2])
            if prev > 0:
                change_pct = (price - prev) / prev * 100

        name = info.get("longName") or info.get("shortName") or ticker
        currency = info.get("currency", "USD")
        market_cap = info.get("marketCap")
        sector = info.get("sector")

        return FinancialInstrument(
            ticker=ticker,
            name=name,
            price=round(price, 4),
            change_pct=round(change_pct, 4),
            currency=currency,
            market_cap=float(market_cap) if market_cap else None,
            sector=sector,
        )
    except Exception:
        return None


async def fetch_instrument(ticker: str) -> Optional[FinancialInstrument]:
    now = time.time()
    if ticker in _cache:
        instrument, ts = _cache[ticker]
        if now - ts < CACHE_TTL:
            return instrument

    loop = asyncio.get_event_loop()
    instrument = await loop.run_in_executor(None, _fetch_ticker_sync, ticker)
    if instrument:
        _cache[ticker] = (instrument, now)
    return instrument


async def fetch_instruments(tickers: list[str]) -> list[FinancialInstrument]:
    results = await asyncio.gather(*[fetch_instrument(t) for t in tickers])
    return [r for r in results if r is not None]

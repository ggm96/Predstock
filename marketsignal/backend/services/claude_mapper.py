import asyncio
import json
import os
import re

_cache: dict[str, dict] = {}

VALID_CATEGORIES = {"macro", "equities", "crypto", "politics", "commodities", "rates", "other"}

SYSTEM_PROMPT = """You are a financial markets classifier. Given prediction market questions, classify each and identify relevant financial instruments.

For each market output:
- category: one of macro, equities, crypto, politics, commodities, rates, other
- tickers: up to 4 relevant Yahoo Finance tickers (e.g. SPY, AAPL, BTC-USD, GLD, TLT, QQQ)
- rationale: object mapping each ticker to a one-sentence explanation (max 20 words) of why that instrument is affected by this market's outcome

Category rules:
- macro: Fed, interest rates, inflation, CPI, GDP, recession, jobs, tariffs, trade
- equities: specific stocks, S&P, Nasdaq, earnings, IPOs, sectors
- crypto: Bitcoin, Ethereum, any cryptocurrency or blockchain
- politics: elections, presidents, congress, geopolitics, wars
- commodities: oil, gold, silver, gas, agricultural products
- rates: Treasury yields, bond markets, Fed funds rate
- other: sports, entertainment, science, anything without a clear financial link — use empty tickers []

Respond ONLY with a JSON array, one object per market, in input order.
Format: [{"id": "...", "category": "...", "tickers": ["..."], "rationale": {"TICKER": "reason"}}]"""

BATCH_SIZE = 20
MAX_CONCURRENT = 5


async def _classify_batch(client, batch: list) -> None:
    market_lines = "\n".join(
        f'{j + 1}. id="{m.id}" title="{m.title}" question="{m.question[:200]}"'
        for j, m in enumerate(batch)
    )
    try:
        resp = await client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=2048,
            system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": f"Classify these prediction markets:\n\n{market_lines}"}],
        )
        text = resp.content[0].text if resp.content else ""
        match = re.search(r"\[.*\]", text, re.DOTALL)
        if not match:
            return
        items = json.loads(match.group())
        for item in items:
            if not isinstance(item, dict):
                continue
            market_id = item.get("id")
            if not market_id:
                continue
            cat = item.get("category", "other")
            if cat not in VALID_CATEGORIES:
                cat = "other"
            raw_tickers = item.get("tickers", [])
            tickers = [str(t).upper() for t in raw_tickers if t][:4] if isinstance(raw_tickers, list) else []
            raw_rationale = item.get("rationale", {})
            ticker_rationales = {}
            if isinstance(raw_rationale, dict):
                ticker_rationales = {str(k).upper(): str(v) for k, v in raw_rationale.items() if v}
            elif isinstance(raw_rationale, str):
                for t in tickers:
                    ticker_rationales[t] = raw_rationale
            _cache[market_id] = {"category": cat, "tickers": tickers, "ticker_rationales": ticker_rationales}
    except Exception:
        pass


async def classify_markets(markets: list) -> dict[str, dict]:
    """Classify markets using Claude (concurrent batches). Returns {market_id: {category, tickers, ticker_rationales}}."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {}
    try:
        import anthropic
    except ImportError:
        return {}

    uncached = [m for m in markets if m.id not in _cache]
    if not uncached:
        return {m.id: _cache[m.id] for m in markets if m.id in _cache}

    client = anthropic.AsyncAnthropic(api_key=api_key)
    batches = [uncached[i: i + BATCH_SIZE] for i in range(0, len(uncached), BATCH_SIZE)]

    semaphore = asyncio.Semaphore(MAX_CONCURRENT)

    async def _limited(batch):
        async with semaphore:
            await _classify_batch(client, batch)

    await asyncio.gather(*[_limited(b) for b in batches])
    return {m.id: _cache[m.id] for m in markets if m.id in _cache}

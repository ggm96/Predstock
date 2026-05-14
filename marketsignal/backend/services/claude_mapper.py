import json
import os
import re

_cache: dict[str, dict] = {}

VALID_CATEGORIES = {"macro", "equities", "crypto", "politics", "commodities", "rates", "other"}

SYSTEM_PROMPT = """You are a financial markets classifier. Given prediction market questions, classify each and identify relevant financial instruments.

For each market output:
- category: one of macro, equities, crypto, politics, commodities, rates, other
- tickers: up to 4 relevant Yahoo Finance tickers (e.g. SPY, AAPL, BTC-USD, GLD, TLT, QQQ)
- rationale: one sentence (max 20 words) explaining why this market outcome would move those instruments

Category rules:
- macro: Fed, interest rates, inflation, CPI, GDP, recession, jobs, tariffs, trade
- equities: specific stocks, S&P, Nasdaq, earnings, IPOs, sectors
- crypto: Bitcoin, Ethereum, any cryptocurrency or blockchain
- politics: elections, presidents, congress, geopolitics, wars
- commodities: oil, gold, silver, gas, agricultural products
- rates: Treasury yields, bond markets, Fed funds rate

Respond ONLY with a JSON array, one object per market, in input order.
Format: [{"id": "...", "category": "...", "tickers": ["..."], "rationale": "..."}]"""


async def classify_markets(markets: list) -> dict[str, dict]:
    """Classify markets using Claude. Returns {market_id: {category, tickers, rationale}}."""
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

    BATCH_SIZE = 20
    for i in range(0, len(uncached), BATCH_SIZE):
        batch = uncached[i : i + BATCH_SIZE]
        market_lines = "\n".join(
            f'{j + 1}. id="{m.id}" title="{m.title}" question="{m.question[:200]}"'
            for j, m in enumerate(batch)
        )

        try:
            resp = await client.messages.create(
                model="claude-haiku-4-5",
                max_tokens=2048,
                system=[
                    {
                        "type": "text",
                        "text": SYSTEM_PROMPT,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                messages=[
                    {
                        "role": "user",
                        "content": f"Classify these prediction markets:\n\n{market_lines}",
                    }
                ],
            )

            text = resp.content[0].text if resp.content else ""
            match = re.search(r"\[.*\]", text, re.DOTALL)
            if not match:
                continue

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
                rationale = item.get("rationale") or None
                _cache[market_id] = {"category": cat, "tickers": tickers, "rationale": rationale}
        except Exception:
            pass

    return {m.id: _cache[m.id] for m in markets if m.id in _cache}

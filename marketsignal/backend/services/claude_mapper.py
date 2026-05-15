import asyncio
import json
import os
import re

_CACHE_FILE = "/tmp/claude_cache.json"
_cache: dict[str, dict] = {}  # {market_id: {"company": "Name"} or {"company": None}}

SYSTEM_PROMPT = """You are a financial analyst. Given prediction market questions, identify which relate to a specific named company (public or private).

Rules:
- INCLUDE: markets explicitly about a named company (Apple, Tesla, SpaceX, Goldman Sachs, Nvidia, etc.)
- EXCLUDE: sports teams, athletes, weather, entertainment, celebrities without a business angle
- EXCLUDE: general economic indicators (inflation, GDP) unless tied to a specific company
- EXCLUDE: government/political markets unless a specific company is central

Return a JSON array containing ONLY the company-related markets:
[{"id": "...", "company": "Exact Company Name"}]

Return [] if none qualify."""

BATCH_SIZE = 500


def _load_cache() -> None:
    global _cache
    try:
        if os.path.exists(_CACHE_FILE):
            with open(_CACHE_FILE) as f:
                _cache = json.load(f)
    except Exception:
        _cache = {}


def _save_cache() -> None:
    try:
        with open(_CACHE_FILE, "w") as f:
            json.dump(_cache, f)
    except Exception:
        pass


_load_cache()


async def _classify_batch(client, batch: list) -> None:
    market_lines = "\n".join(
        f'{j + 1}. id="{m.id}" q="{m.title[:150]}"'
        for j, m in enumerate(batch)
    )
    # Mark all as processed upfront so a failed call doesn't cause re-runs
    for m in batch:
        if m.id not in _cache:
            _cache[m.id] = {"company": None}
    try:
        resp = await client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=4096,
            system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
            messages=[{"role": "user", "content": f"Identify company-related markets:\n\n{market_lines}"}],
        )
        text = resp.content[0].text if resp.content else ""
        match = re.search(r"\[.*\]", text, re.DOTALL)
        if match:
            for item in json.loads(match.group()):
                if isinstance(item, dict) and item.get("id") and item.get("company", "").strip():
                    _cache[item["id"]] = {"company": item["company"].strip()}
    except Exception:
        pass
    _save_cache()


async def classify_markets(markets: list) -> dict[str, dict]:
    """Identify company-related markets using Claude. Each market ID is classified only once ever."""
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
    for i in range(0, len(uncached), BATCH_SIZE):
        await _classify_batch(client, uncached[i: i + BATCH_SIZE])

    return {m.id: _cache[m.id] for m in markets if m.id in _cache}

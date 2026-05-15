CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "macro": ["fed", "federal reserve", "interest rate", "inflation", "cpi", "recession", "gdp", "unemployment", "tariff", "trade war"],
    "equities": ["s&p", "nasdaq", "dow jones", "stock market", "nvidia", "apple", "tesla", "microsoft", "google", "alphabet", "amazon", "meta", "ipo", "bank", "housing", "semiconductor"],
    "crypto": ["bitcoin", "btc", "ethereum", "eth", "crypto", "coinbase", "solana"],
    "politics": ["trump", "election", "ukraine", "war", "china"],
    "commodities": ["oil", "crude", "gold", "silver", "natural gas", "energy"],
    "rates": ["interest rate", "fed", "federal reserve", "treasury"],
}


def categorise_market(title: str, tags: list[str], question: str = "") -> str:
    combined = " ".join([title, question, " ".join(tags)]).lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in combined:
                return category
    return "other"

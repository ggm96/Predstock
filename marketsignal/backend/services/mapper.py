KEYWORD_TICKER_MAP: dict[str, list[str]] = {
    "fed": ["TLT", "SHY", "SPY"],
    "federal reserve": ["TLT", "SHY", "SPY"],
    "interest rate": ["TLT", "IEF", "SPY"],
    "inflation": ["TIP", "GLD", "SPY"],
    "cpi": ["TIP", "SPY", "GLD"],
    "recession": ["SPY", "GLD", "TLT", "SH"],
    "gdp": ["SPY", "EFA", "VEA"],
    "unemployment": ["SPY", "XLY", "TLT"],
    "s&p": ["SPY", "VOO"],
    "nasdaq": ["QQQ", "ONEQ"],
    "dow jones": ["DIA", "SPY"],
    "stock market": ["SPY", "QQQ"],
    "nvidia": ["NVDA"],
    "apple": ["AAPL"],
    "tesla": ["TSLA"],
    "microsoft": ["MSFT"],
    "google": ["GOOGL"],
    "alphabet": ["GOOGL"],
    "amazon": ["AMZN"],
    "meta": ["META"],
    "ipo": ["IPO", "SPY"],
    "bitcoin": ["BTC-USD", "IBIT", "MSTR"],
    "btc": ["BTC-USD", "IBIT"],
    "ethereum": ["ETH-USD", "ETHA"],
    "eth": ["ETH-USD"],
    "crypto": ["BTC-USD", "ETH-USD", "COIN"],
    "coinbase": ["COIN"],
    "solana": ["SOL-USD"],
    "oil": ["USO", "XOM", "CVX"],
    "crude": ["USO", "CL=F"],
    "gold": ["GLD", "GDX", "IAU"],
    "silver": ["SLV"],
    "natural gas": ["UNG", "NG=F"],
    "trump": ["DJT", "DWAC"],
    "election": ["SPY", "GLD"],
    "trade war": ["SPY", "EEM", "FXI"],
    "tariff": ["SPY", "EEM", "XLI"],
    "china": ["FXI", "MCHI", "EEM"],
    "ukraine": ["LMT", "RTX", "GLD"],
    "war": ["LMT", "RTX", "GLD", "USO"],
    "ai": ["NVDA", "MSFT", "GOOGL", "QQQ"],
    "artificial intelligence": ["NVDA", "MSFT", "GOOGL"],
    "semiconductor": ["NVDA", "AMD", "SOXX"],
    "bank": ["XLF", "JPM", "BAC"],
    "housing": ["XHB", "ITB", "DHI"],
    "energy": ["XLE", "USO", "XOM"],
    "healthcare": ["XLV", "UNH", "JNJ"],
}

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "macro": ["fed", "federal reserve", "interest rate", "inflation", "cpi", "recession", "gdp", "unemployment", "tariff", "trade war"],
    "equities": ["s&p", "nasdaq", "dow jones", "stock market", "nvidia", "apple", "tesla", "microsoft", "google", "alphabet", "amazon", "meta", "ipo", "bank", "housing", "semiconductor"],
    "crypto": ["bitcoin", "btc", "ethereum", "eth", "crypto", "coinbase", "solana"],
    "politics": ["trump", "election", "ukraine", "war", "china"],
    "commodities": ["oil", "crude", "gold", "silver", "natural gas", "energy"],
    "rates": ["interest rate", "fed", "federal reserve", "tlt", "treasury"],
}


def map_market_to_tickers(title: str, question: str, tags: list[str]) -> list[str]:
    combined = " ".join([title, question, " ".join(tags)]).lower()
    found: list[str] = []
    seen: set[str] = set()

    # Sort by keyword length descending so longer phrases match first
    for keyword in sorted(KEYWORD_TICKER_MAP, key=len, reverse=True):
        if keyword in combined:
            for ticker in KEYWORD_TICKER_MAP[keyword]:
                if ticker not in seen:
                    seen.add(ticker)
                    found.append(ticker)
                if len(found) >= 4:
                    break
        if len(found) >= 4:
            break

    return found if found else ["SPY"]


def categorise_market(title: str, tags: list[str]) -> str:
    combined = " ".join([title, " ".join(tags)]).lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in combined:
                return category
    return "other"

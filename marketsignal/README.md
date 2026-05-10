# MarketSignal

Aggregates prediction market positions from Kalshi, Polymarket, Manifold, and Metaculus and maps them to real-world financial instruments with live price data.

## Stack

- **Backend**: Python 3.11+, FastAPI, uvicorn, httpx, yfinance, pydantic
- **Frontend**: React 18, Vite, Tailwind CSS, Recharts, Lucide React

## Running

**Backend** (terminal 1):
```bash
cd marketsignal/backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend** (terminal 2):
```bash
cd marketsignal/frontend
npm install
npm run dev
```

Open http://localhost:5173

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/markets` | List markets (filterable by source, category, probability, search) |
| GET | `/api/instruments/summary` | Aggregated instrument view |
| GET | `/api/health` | Source status and cache info |

### Query params for `/api/markets`

- `source` — filter by platform (`kalshi`, `polymarket`, `manifold`, `metaculus`)
- `category` — filter by category (`macro`, `equities`, `crypto`, `politics`, `commodities`, `rates`, `other`)
- `min_probability` / `max_probability` — float 0–1
- `search` — text search in title/question
- `limit` — max results (default 50)

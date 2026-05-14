import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from routers import markets, instruments

app = FastAPI(title="MarketSignal", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(markets.router, prefix="/api")
app.include_router(instruments.router, prefix="/api")

# Serve built React frontend in production
_dist = os.path.join(os.path.dirname(__file__), "frontend_dist")
if os.path.exists(_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def _spa(full_path: str):
        return FileResponse(os.path.join(_dist, "index.html"))

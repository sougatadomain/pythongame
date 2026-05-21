# ============================================================
# main.py — FastAPI Backend Entry Point
# Run with: uvicorn main:app --reload --port 8000
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import game, ws

app = FastAPI(title="Typing Battle API", version="1.0.0")

# Allow React dev server (port 3000) and any future deployment origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(game.router, prefix="/api")
app.include_router(ws.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}

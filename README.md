# Typing Battle Game

## Quick Start

### Frontend
```bash
cd frontend
npm create vite@latest . -- --template react
npm install
# Copy src/ files from this project
npm run dev        # → http://localhost:5173
```

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Architecture
- **Frontend**: React + Vite, Space Mono font, dark arcade aesthetic
- **Backend**: FastAPI with WebSocket support for real-time multiplayer
- **State**: useReducer/useState (upgrade to Zustand for complex state)
- **Metrics**: WPM = (correct chars / 5) / elapsed minutes

## Expansion Roadmap
1. Add SQLite persistence via SQLAlchemy
2. Add useWebSocket hook for real multiplayer
3. Add user auth (JWT via FastAPI-Users)
4. Add difficulty-based leaderboard
5. Add sound effects (Web Audio API)

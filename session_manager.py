from typing import List
from fastapi import WebSocket

class SessionManager:
    def __init__(self):
        # Stores all active player connections
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        # Sends a message to all connected players
        for connection in self.active_connections:
            await connection.send_text(message)

# Create a global instance to be imported by ws.py
manager = SessionManager()
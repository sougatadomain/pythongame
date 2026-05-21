# ============================================================
# services/game_logic.py
# Pure functions for server-side stat computation.
# Mirror of frontend utils/metrics.js — keep in sync.
# ============================================================

import math


def calculate_wpm(correct_chars: int, elapsed_seconds: float) -> int:
    """Standard WPM: words = chars / 5, time in minutes."""
    if elapsed_seconds < 0.5:
        return 0
    minutes = elapsed_seconds / 60
    words = correct_chars / 5
    return round(words / minutes)


def calculate_accuracy(correct_chars: int, total_keystrokes: int) -> float:
    if total_keystrokes == 0:
        return 100.0
    return round((correct_chars / total_keystrokes) * 100, 1)


def calculate_battle_score(wpm: int, accuracy: float) -> int:
    """score = WPM × (accuracy / 100)²"""
    return round(wpm * (accuracy / 100) ** 2)


def compute_final_stats(
    correct_chars,
    total_keystrokes,
    elapsed_seconds: float,
    wpm: int = None,
    accuracy: float = None,
) -> dict:
    """
    Compute the full stat block for a finished game.
    Accepts either raw chars/keystrokes OR pre-computed wpm/accuracy
    (trusting the client — validate in production).
    """
    final_wpm = wpm if wpm is not None else (
        calculate_wpm(correct_chars, elapsed_seconds)
    )
    final_accuracy = accuracy if accuracy is not None else (
        calculate_accuracy(correct_chars, total_keystrokes)
    )
    battle_score = calculate_battle_score(final_wpm, final_accuracy)

    return {
        "wpm": final_wpm,
        "accuracy": final_accuracy,
        "battle_score": battle_score,
        "elapsed_seconds": round(elapsed_seconds, 2),
    }


# ============================================================
# services/session_manager.py
# In-memory room/match state for WebSocket multiplayer.
# Replace with Redis for production multi-server deployments.
# ============================================================

from fastapi import WebSocket


class SessionManager:
    def __init__(self):
        # room_id → { player_name → WebSocket }
        self._rooms: dict[str, dict[str, WebSocket]] = {}
        # room_id → prompt string
        self._prompts: dict[str, str] = {}
        # room_id → [ordered list of finished player names]
        self._finished: dict[str, list[str]] = {}

    def join_room(self, room_id: str, player_name: str, ws: WebSocket):
        if room_id not in self._rooms:
            self._rooms[room_id] = {}
            self._finished[room_id] = []
        self._rooms[room_id][player_name] = ws

    def leave_room(self, room_id: str, player_name: str):
        if room_id in self._rooms:
            self._rooms[room_id].pop(player_name, None)
            if not self._rooms[room_id]:
                del self._rooms[room_id]

    def get_room_players(self, room_id: str) -> list[str]:
        return list(self._rooms.get(room_id, {}).keys())

    def set_room_prompt(self, room_id: str, prompt: str):
        self._prompts[room_id] = prompt

    def mark_finished(self, room_id: str, player_name: str):
        finished = self._finished.setdefault(room_id, [])
        if player_name not in finished:
            finished.append(player_name)

    def get_finished_players(self, room_id: str) -> list[str]:
        return self._finished.get(room_id, [])

    async def broadcast(self, room_id: str, message: dict):
        """Send a message to all connections in a room."""
        import json
        room = self._rooms.get(room_id, {})
        dead = []
        for name, ws in room.items():
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.append(name)
        for name in dead:
            self.leave_room(room_id, name)

    async def broadcast_except(self, room_id: str, exclude: str, message: dict):
        """Send to all players in a room except the sender."""
        import json
        room = self._rooms.get(room_id, {})
        for name, ws in room.items():
            if name != exclude:
                try:
                    await ws.send_text(json.dumps(message))
                except Exception:
                    pass

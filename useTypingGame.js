// ============================================================
// useTypingGame.js
// The central state machine for all typing gameplay logic.
// Tracks per-character state, calculates live metrics, and
// manages game lifecycle (idle → countdown → playing → done).
// ============================================================

import { useState, useCallback, useEffect, useRef } from "react";
import { calculateWPM, calculateAccuracy } from "../utils/metrics";

// Each character in the prompt gets one of these states
export const CHAR_STATE = {
  PENDING:   "pending",    // not yet typed
  CORRECT:   "correct",   // typed correctly
  INCORRECT: "incorrect", // typed incorrectly
  SKIPPED:   "skipped",   // cursor moved past without correction
};

export const GAME_PHASE = {
  IDLE:       "idle",       // waiting to start
  COUNTDOWN:  "countdown",  // 3-2-1 before race
  PLAYING:    "playing",    // actively typing
  FINISHED:   "finished",   // player completed the prompt
};

/**
 * @param {string} prompt         - The text the player must type
 * @param {number} timeLimitSecs  - 0 = no limit (race mode), >0 = time attack
 */
export function useTypingGame(prompt, timeLimitSecs = 0) {
  // ─── Core State ────────────────────────────────────────────
  const [phase, setPhase]           = useState(GAME_PHASE.IDLE);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [typedChars, setTypedChars] = useState([]); // Array of CHAR_STATE values
  const [inputBuffer, setInputBuffer] = useState(""); // raw value from hidden <input>
  const [errorCount, setErrorCount] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);

  // ─── Timing Refs ──────────────────────────────────────────
  const startTimeRef    = useRef(null); // Date.ms when typing began
  const elapsedRef      = useRef(0);   // seconds elapsed (used for WPM)
  const [elapsedDisplay, setElapsedDisplay] = useState(0); // reactive version for UI

  // ─── Live Metrics ─────────────────────────────────────────
  const [wpm, setWpm]           = useState(0);
  const [accuracy, setAccuracy] = useState(100);

  // ─── Derived ──────────────────────────────────────────────
  const progress = prompt.length > 0 ? cursorIndex / prompt.length : 0;
  const isFinished = phase === GAME_PHASE.FINISHED;

  // ─── Initialise / Reset char states when prompt changes ────
  useEffect(() => {
    resetGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt]);

  // ─── Live timer tick while playing ────────────────────────
  useEffect(() => {
    if (phase !== GAME_PHASE.PLAYING) return;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      elapsedRef.current = elapsed;
      setElapsedDisplay(elapsed);

      // Recalculate WPM every tick
      const correctChars = typedChars.filter(s => s === CHAR_STATE.CORRECT).length;
      setWpm(calculateWPM(correctChars, elapsed));

      // Time-attack mode: auto-finish when timer runs out
      if (timeLimitSecs > 0 && elapsed >= timeLimitSecs) {
        finishGame();
      }
    }, 200); // 5fps tick is smooth enough for display

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, typedChars, timeLimitSecs]);

  // ─── Start game (called by countdown completion) ───────────
  const startGame = useCallback(() => {
    startTimeRef.current = Date.now();
    setPhase(GAME_PHASE.PLAYING);
  }, []);

  // ─── End game ──────────────────────────────────────────────
  const finishGame = useCallback(() => {
    setPhase(GAME_PHASE.FINISHED);
  }, []);

  // ─── Reset everything ──────────────────────────────────────
  const resetGame = useCallback(() => {
    setPhase(GAME_PHASE.IDLE);
    setCursorIndex(0);
    setTypedChars(new Array(prompt.length).fill(CHAR_STATE.PENDING));
    setInputBuffer("");
    setErrorCount(0);
    setTotalKeystrokes(0);
    setWpm(0);
    setAccuracy(100);
    setElapsedDisplay(0);
    startTimeRef.current = null;
    elapsedRef.current = 0;
  }, [prompt]);

  // ─── The core keystroke handler ────────────────────────────
  // Called with the full current value of the hidden <input>.
  // We diff against inputBuffer to detect additions/deletions.
  const handleInput = useCallback((newValue) => {
    if (phase !== GAME_PHASE.PLAYING) return;
    if (cursorIndex >= prompt.length) return;

    const prevLength = inputBuffer.length;
    const newLength  = newValue.length;
    const newChars   = [...typedChars];

    if (newLength > prevLength) {
      // ── Character added ──────────────────────────────────
      const typedChar   = newValue[newValue.length - 1];
      const expectedChar = prompt[cursorIndex];
      const isCorrect   = typedChar === expectedChar;

      newChars[cursorIndex] = isCorrect ? CHAR_STATE.CORRECT : CHAR_STATE.INCORRECT;

      const newCursorIndex = cursorIndex + 1;
      const newErrors = errorCount + (isCorrect ? 0 : 1);
      const newKeystrokes = totalKeystrokes + 1;

      setTypedChars(newChars);
      setCursorIndex(newCursorIndex);
      setErrorCount(newErrors);
      setTotalKeystrokes(newKeystrokes);
      setAccuracy(calculateAccuracy(newKeystrokes - newErrors, newKeystrokes));

      // Check for completion
      if (newCursorIndex >= prompt.length) {
        finishGame();
      }

    } else if (newLength < prevLength) {
      // ── Backspace pressed ────────────────────────────────
      // Prevent deleting past the start
      if (cursorIndex === 0) {
        setInputBuffer("");
        return;
      }
      const prevCursorIndex = cursorIndex - 1;
      newChars[prevCursorIndex] = CHAR_STATE.PENDING;

      setTypedChars(newChars);
      setCursorIndex(prevCursorIndex);
      // Note: we don't decrement errorCount — mistakes are permanent in metrics
    }

    setInputBuffer(newValue);
  }, [
    phase, cursorIndex, prompt, typedChars,
    inputBuffer, errorCount, totalKeystrokes, finishGame
  ]);

  // ─── Begin countdown (call this on "Start Battle" click) ──
  const beginCountdown = useCallback(() => {
    resetGame();
    setPhase(GAME_PHASE.COUNTDOWN);
  }, [resetGame]);

  return {
    // State
    phase,
    cursorIndex,
    typedChars,
    inputBuffer,
    progress,        // 0.0 → 1.0 for progress bar
    isFinished,

    // Metrics
    wpm,
    accuracy,
    errorCount,
    totalKeystrokes,
    elapsedDisplay,

    // Actions
    handleInput,
    startGame,
    finishGame,
    resetGame,
    beginCountdown,
  };
}

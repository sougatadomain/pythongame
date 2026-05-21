// ============================================================
// TypingBattleGame.jsx
// Main game component. Self-contained — paste this into any
// React project and import the two hooks from above.
//
// Aesthetic: Dark cyberpunk arcade with neon green accents.
// Font: Space Mono (monospace, perfect for typing games).
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";
import { useTypingGame, CHAR_STATE, GAME_PHASE } from "./hooks/useTypingGame";
import { useBotOpponent } from "./hooks/useBotOpponent";
import { calculateBattleScore, getSpeedLabel, formatTime } from "./utils/metrics";

// ─── Sample prompts (in production: fetch from /api/prompts) ─────────────────
const PROMPTS = {
  easy: [
    "The quick brown fox jumps over the lazy dog near the river bank.",
    "She sells sea shells by the sea shore every morning without fail.",
    "Practice makes perfect and typing is no exception to this rule.",
  ],
  medium: [
    "Programming is the art of telling another human what one wants the computer to do.",
    "The best way to predict the future is to invent it with your own two hands.",
    "In theory there is no difference between theory and practice, but in practice there is.",
  ],
  hard: [
    "Asynchronous JavaScript relies on Promises, async/await, and the event loop to handle non-blocking I/O operations.",
    "The Byzantine Generals Problem describes a challenge in distributed computing where consensus must be reached despite unreliable actors.",
    "Quicksort achieves O(n log n) average-case complexity through recursive partitioning around a pivot element.",
  ],
};

// ─── Bot difficulty configs ───────────────────────────────────────────────────
const BOT_CONFIGS = {
  easy:   { name: "Rookie Bot",   wpm: 35,  color: "#34D399" },
  medium: { name: "Cyber Bot",    wpm: 65,  color: "#60A5FA" },
  hard:   { name: "Turbo Bot",    wpm: 95,  color: "#F87171" },
};

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(onComplete) {
  const [count, setCount] = useState(null);

  const start = useCallback(() => setCount(3), []);

  useEffect(() => {
    if (count === null) return;
    if (count === 0) {
      setCount(null);
      onComplete();
      return;
    }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onComplete]);

  return { count, start };
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function TypingBattleGame() {
  const [difficulty, setDifficulty] = useState("medium");
  const [promptIndex, setPromptIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);

  const prompt = PROMPTS[difficulty][promptIndex % PROMPTS[difficulty].length];
  const botConfig = BOT_CONFIGS[difficulty];

  // ─── Game hook ─────────────────────────────────────────────────────────────
  const game = useTypingGame(prompt, 0);

  // ─── Bot hook ──────────────────────────────────────────────────────────────
  const { botProgress, botFinished, botWpm, resetBot } = useBotOpponent(
    prompt,
    botConfig.wpm,
    game.phase === GAME_PHASE.PLAYING
  );

  // ─── Countdown ─────────────────────────────────────────────────────────────
  const { count: countdownNum, start: startCountdown } = useCountdown(game.startGame);

  // ─── Hidden input ref (captures all keystrokes) ────────────────────────────
  const inputRef = useRef(null);

  // Focus the hidden input whenever we're playing
  useEffect(() => {
    if (game.phase === GAME_PHASE.PLAYING) {
      inputRef.current?.focus();
    }
  }, [game.phase]);

  // Show results when game finishes
  useEffect(() => {
    if (game.phase === GAME_PHASE.FINISHED || botFinished) {
      setTimeout(() => setShowResults(true), 400);
    }
  }, [game.phase, botFinished]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleStartBattle = () => {
    setShowResults(false);
    game.resetGame();
    resetBot();
    startCountdown();
  };

  const handleNextRound = () => {
    setPromptIndex(i => i + 1);
    setShowResults(false);
    game.resetGame();
    resetBot();
  };

  const playerWon = game.isFinished && !botFinished;
  const botWon    = botFinished && !game.isFinished;
  const tie       = game.isFinished && botFinished;

  const finalScore = calculateBattleScore(game.wpm, game.accuracy);
  const speedLabel = getSpeedLabel(game.wpm);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      {/* ── Scanline overlay for atmosphere ── */}
      <div style={styles.scanlines} aria-hidden="true" />

      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>⌨</span>
          <span style={styles.logoText}>TYPING<span style={styles.logoBattle}>BATTLE</span></span>
        </div>
        <div style={styles.diffSelector}>
          {["easy", "medium", "hard"].map(d => (
            <button
              key={d}
              style={{
                ...styles.diffBtn,
                ...(difficulty === d ? styles.diffBtnActive : {}),
                ...(d === "hard" && difficulty === d ? { borderColor: "#F87171", color: "#F87171" } : {}),
              }}
              onClick={() => {
                setDifficulty(d);
                setShowResults(false);
                game.resetGame();
                resetBot();
              }}
            >
              {d.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* ── Battle Arena ── */}
      <main style={styles.arena}>

        {/* ── Progress Bars (Player vs Bot) ── */}
        <div style={styles.progressSection}>
          {/* Player */}
          <ProgressBar
            label="YOU"
            wpm={game.wpm}
            progress={game.progress}
            color="#39FF14"
            isPlayer={true}
          />
          {/* Bot */}
          <ProgressBar
            label={botConfig.name.toUpperCase()}
            wpm={botWpm}
            progress={botProgress}
            color={botConfig.color}
            isPlayer={false}
          />
        </div>

        {/* ── Score Dashboard ── */}
        <div style={styles.dashboard}>
          <Metric label="WPM"      value={game.wpm}            color="#39FF14" />
          <Metric label="ACCURACY" value={`${game.accuracy}%`} color="#60A5FA" />
          <Metric label="ERRORS"   value={game.errorCount}     color="#F87171" />
          <Metric label="TIME"     value={formatTime(game.elapsedDisplay)} color="#A78BFA" />
        </div>

        {/* ── Prompt Display (GameBoard) ── */}
        <div style={styles.gameBoardWrapper} onClick={() => inputRef.current?.focus()}>
          {/* Countdown overlay */}
          {game.phase === GAME_PHASE.COUNTDOWN && countdownNum !== null && (
            <div style={styles.countdownOverlay}>
              <span style={styles.countdownNumber}>{countdownNum}</span>
            </div>
          )}

          {/* Idle overlay */}
          {game.phase === GAME_PHASE.IDLE && (
            <div style={styles.idleOverlay}>
              <button style={styles.startBtn} onClick={handleStartBattle}>
                ▶ START BATTLE
              </button>
            </div>
          )}

          {/* The prompt text */}
          <div style={styles.promptDisplay} aria-label="Typing prompt">
            {prompt.split("").map((char, i) => {
              const state = game.typedChars[i] || CHAR_STATE.PENDING;
              const isCursor = i === game.cursorIndex && game.phase === GAME_PHASE.PLAYING;

              return (
                <span
                  key={i}
                  style={{
                    ...styles.promptChar,
                    ...charStateStyle(state),
                    ...(isCursor ? styles.cursor : {}),
                  }}
                >
                  {/* Render spaces as a visible underscore so cursor is visible */}
                  {char === " " ? "\u00A0" : char}
                </span>
              );
            })}
          </div>

          {/* Hidden input — this is what actually captures keystrokes */}
          <input
            ref={inputRef}
            style={styles.hiddenInput}
            value={game.inputBuffer}
            onChange={e => game.handleInput(e.target.value)}
            onKeyDown={e => {
              // Prevent Tab from leaving the input
              if (e.key === "Tab") e.preventDefault();
            }}
            disabled={game.phase !== GAME_PHASE.PLAYING}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            aria-label="Type here to play"
          />

          {/* Click-to-focus hint */}
          {game.phase === GAME_PHASE.PLAYING && (
            <p style={styles.focusHint}>Click here if typing stops responding</p>
          )}
        </div>

        {/* ── Results Overlay ── */}
        {showResults && (
          <ResultsScreen
            playerWon={playerWon}
            botWon={botWon}
            tie={tie}
            wpm={game.wpm}
            accuracy={game.accuracy}
            errors={game.errorCount}
            elapsed={game.elapsedDisplay}
            score={finalScore}
            speedLabel={speedLabel}
            botWpm={botWpm}
            botName={botConfig.name}
            onRematch={handleStartBattle}
            onNext={handleNextRound}
          />
        )}
      </main>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

function ProgressBar({ label, wpm, progress, color, isPlayer }) {
  return (
    <div style={styles.progressRow}>
      <div style={styles.progressLabel}>
        <span style={{ color, fontFamily: "'Space Mono', monospace", fontSize: 11, letterSpacing: 2 }}>
          {isPlayer ? "▶ " : "🤖 "}{label}
        </span>
        <span style={{ color, fontFamily: "'Space Mono', monospace", fontSize: 11 }}>
          {wpm > 0 ? `${wpm} WPM` : "—"}
        </span>
      </div>
      <div style={styles.progressTrack}>
        <div
          style={{
            ...styles.progressFill,
            width: `${Math.min(progress * 100, 100)}%`,
            background: color,
            boxShadow: `0 0 8px ${color}88`,
          }}
        />
        {/* Finish flag */}
        <span style={{ ...styles.finishFlag, color }}>⚑</span>
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div style={styles.metric}>
      <div style={{ ...styles.metricValue, color }}>{value}</div>
      <div style={styles.metricLabel}>{label}</div>
    </div>
  );
}

function ResultsScreen({ playerWon, botWon, wpm, accuracy, errors, elapsed, score,
                         speedLabel, botWpm, botName, onRematch, onNext }) {
  const outcomeText = playerWon ? "VICTORY!" : botWon ? "DEFEAT" : "DRAW";
  const outcomeColor = playerWon ? "#39FF14" : botWon ? "#F87171" : "#A78BFA";

  return (
    <div style={styles.resultsOverlay}>
      <div style={styles.resultsCard}>
        <div style={{ fontSize: 36, fontWeight: 700, color: outcomeColor, marginBottom: 4,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 4 }}>
          {outcomeText}
        </div>
        <div style={{ fontSize: 13, color: speedLabel.color, marginBottom: 20,
                      fontFamily: "'Space Mono', monospace", letterSpacing: 2 }}>
          {speedLabel.label}
        </div>

        <div style={styles.resultsGrid}>
          <ResultStat label="YOUR WPM"  value={wpm}            color="#39FF14" />
          <ResultStat label="BOT WPM"   value={botWpm || "—"}  color={botWon ? "#F87171" : "#888"} />
          <ResultStat label="ACCURACY"  value={`${accuracy}%`} color="#60A5FA" />
          <ResultStat label="ERRORS"    value={errors}         color="#F87171" />
          <ResultStat label="TIME"      value={formatTime(elapsed)} color="#A78BFA" />
          <ResultStat label="SCORE"     value={score}          color="#FFD700" />
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
          <button style={{ ...styles.resultBtn, background: "#39FF1422", borderColor: "#39FF14", color: "#39FF14" }}
                  onClick={onRematch}>⟳ REMATCH</button>
          <button style={{ ...styles.resultBtn, background: "#60A5FA22", borderColor: "#60A5FA", color: "#60A5FA" }}
                  onClick={onNext}>NEXT PROMPT ▶</button>
        </div>
      </div>
    </div>
  );
}

function ResultStat({ label, value, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ color, fontSize: 22, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{value}</div>
      <div style={{ color: "#555", fontSize: 10, letterSpacing: 2, marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════════════════

function charStateStyle(state) {
  switch (state) {
    case CHAR_STATE.CORRECT:   return { color: "#39FF14" };
    case CHAR_STATE.INCORRECT: return { color: "#F87171", background: "#F8717122", borderRadius: 2 };
    case CHAR_STATE.SKIPPED:   return { color: "#F59E0B" };
    default:                   return { color: "#4B5563" };
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════

const styles = {
  root: {
    minHeight: "100vh",
    background: "#0A0A0F",
    color: "#E5E7EB",
    fontFamily: "'Space Mono', 'Courier New', monospace",
    position: "relative",
    overflow: "hidden",
  },
  scanlines: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    zIndex: 0,
    background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 32px",
    borderBottom: "1px solid #1F2937",
    position: "relative",
    zIndex: 1,
  },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoIcon: { fontSize: 22 },
  logoText: { fontSize: 18, fontWeight: 700, letterSpacing: 4, color: "#E5E7EB" },
  logoBattle: { color: "#39FF14", marginLeft: 4 },
  diffSelector: { display: "flex", gap: 8 },
  diffBtn: {
    background: "transparent",
    border: "1px solid #374151",
    color: "#6B7280",
    padding: "5px 14px",
    fontSize: 11,
    letterSpacing: 2,
    cursor: "pointer",
    fontFamily: "'Space Mono', monospace",
    borderRadius: 3,
    transition: "all 0.15s",
  },
  diffBtnActive: {
    borderColor: "#39FF14",
    color: "#39FF14",
    background: "#39FF1415",
  },
  arena: {
    maxWidth: 860,
    margin: "0 auto",
    padding: "32px 24px",
    position: "relative",
    zIndex: 1,
  },
  progressSection: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginBottom: 24,
  },
  progressRow: { display: "flex", flexDirection: "column", gap: 4 },
  progressLabel: { display: "flex", justifyContent: "space-between" },
  progressTrack: {
    height: 8,
    background: "#1F2937",
    borderRadius: 4,
    position: "relative",
    overflow: "visible",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    transition: "width 0.1s ease-out",
    minWidth: 4,
  },
  finishFlag: {
    position: "absolute",
    right: -4,
    top: -6,
    fontSize: 16,
  },
  dashboard: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 1,
    marginBottom: 24,
    background: "#1F2937",
    borderRadius: 8,
    overflow: "hidden",
    border: "1px solid #1F2937",
  },
  metric: {
    background: "#111827",
    padding: "14px 8px",
    textAlign: "center",
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 700,
    lineHeight: 1,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 9,
    letterSpacing: 2,
    color: "#4B5563",
  },
  gameBoardWrapper: {
    position: "relative",
    background: "#0D1117",
    border: "1px solid #21262D",
    borderRadius: 8,
    padding: "28px 32px",
    cursor: "text",
    minHeight: 140,
  },
  promptDisplay: {
    fontSize: 20,
    lineHeight: 1.9,
    letterSpacing: "0.03em",
    wordBreak: "break-word",
    userSelect: "none",
  },
  promptChar: {
    display: "inline",
    transition: "color 0.05s",
    position: "relative",
  },
  cursor: {
    borderLeft: "2px solid #39FF14",
    marginLeft: -1,
    animation: "blink 1s step-start infinite",
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    cursor: "text",
    fontSize: 16, // prevents iOS zoom
    zIndex: 2,
  },
  focusHint: {
    position: "absolute",
    bottom: 8,
    right: 14,
    fontSize: 10,
    color: "#374151",
    margin: 0,
  },
  countdownOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(10,10,15,0.85)",
    borderRadius: 8,
    zIndex: 10,
  },
  countdownNumber: {
    fontSize: 80,
    fontWeight: 700,
    color: "#39FF14",
    textShadow: "0 0 40px #39FF1488",
    animation: "pulse 1s ease-out",
  },
  idleOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(10,10,15,0.7)",
    borderRadius: 8,
    zIndex: 10,
  },
  startBtn: {
    background: "#39FF1415",
    border: "1px solid #39FF14",
    color: "#39FF14",
    fontSize: 16,
    letterSpacing: 4,
    padding: "14px 40px",
    cursor: "pointer",
    fontFamily: "'Space Mono', monospace",
    borderRadius: 4,
    transition: "all 0.15s",
  },
  resultsOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(10,10,15,0.92)",
    borderRadius: 8,
    zIndex: 20,
  },
  resultsCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "32px 40px",
  },
  resultsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px 32px",
    width: "100%",
  },
  resultBtn: {
    padding: "10px 24px",
    fontSize: 12,
    letterSpacing: 2,
    cursor: "pointer",
    fontFamily: "'Space Mono', monospace",
    borderRadius: 4,
    border: "1px solid",
    transition: "all 0.15s",
  },
};

// ── Inject keyframe animations ──────────────────────────────────────────────
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');

    @keyframes blink {
      0%, 100% { border-left-color: #39FF14; }
      50%       { border-left-color: transparent; }
    }
    @keyframes pulse {
      from { transform: scale(1.4); opacity: 0; }
      to   { transform: scale(1);   opacity: 1; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    button:hover { filter: brightness(1.2); }
  `;
  document.head.appendChild(style);
}

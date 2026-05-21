// ============================================================
// hooks/useBotOpponent.js
// Simulates a typing bot opponent with realistic WPM variance.
// The bot's progress is driven by an interval that advances
// character-by-character with Gaussian-distributed timing.
// ============================================================

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Box-Muller transform — turns two uniform random numbers
 * into one standard-normal sample. Used to add realistic
 * jitter to the bot's typing speed.
 */
function gaussianRandom(mean, stdDev) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z0 * stdDev;
}

/**
 * @param {string} prompt       - Same prompt the player is typing
 * @param {number} targetWPM    - Bot's average speed
 * @param {boolean} isActive    - Start/stop signal from parent
 */
export function useBotOpponent(prompt, targetWPM = 75, isActive = false) {
  const [botProgress, setBotProgress] = useState(0);   // 0.0 → 1.0
  const [botCharIndex, setBotCharIndex] = useState(0);
  const [botFinished, setBotFinished] = useState(false);
  const [botWpm, setBotWpm] = useState(0);

  const timeoutRef   = useRef(null);
  const startTimeRef = useRef(null);

  // Calculate milliseconds per character from WPM
  // WPM × 5 chars/word = chars per minute → ms per char
  const msPerChar = (60 / (targetWPM * 5)) * 1000;

  const resetBot = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setBotProgress(0);
    setBotCharIndex(0);
    setBotFinished(false);
    setBotWpm(0);
    startTimeRef.current = null;
  }, []);

  useEffect(() => {
    if (!isActive || !prompt) {
      resetBot();
      return;
    }

    startTimeRef.current = Date.now();
    let currentIndex = 0;

    const typeNextChar = () => {
      if (currentIndex >= prompt.length) {
        setBotFinished(true);
        return;
      }

      currentIndex++;
      setBotCharIndex(currentIndex);
      setBotProgress(currentIndex / prompt.length);

      // Calculate bot's live WPM for display
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      if (elapsed > 0) {
        setBotWpm(Math.round((currentIndex / 5) / (elapsed / 60)));
      }

      if (currentIndex < prompt.length) {
        // Apply Gaussian jitter: std dev = 25% of mean interval
        // Clamp to [10ms, msPerChar * 3] to prevent unrealistic extremes
        const jitteredDelay = Math.max(
          10,
          Math.min(msPerChar * 3, gaussianRandom(msPerChar, msPerChar * 0.25))
        );
        timeoutRef.current = setTimeout(typeNextChar, jitteredDelay);
      }
    };

    // Small startup delay so the bot feels like it's "thinking"
    timeoutRef.current = setTimeout(typeNextChar, 300);

    return () => {
      clearTimeout(timeoutRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, prompt]);

  return {
    botProgress,
    botCharIndex,
    botFinished,
    botWpm,
    resetBot,
  };
}

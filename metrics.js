// ============================================================
// utils/metrics.js
// Pure functions for typing metric calculations.
// Keeping these separate makes them easy to unit-test and reuse
// on the backend (copy-paste to game_logic.py).
// ============================================================

/**
 * Calculate Words Per Minute.
 * Industry standard: 1 "word" = 5 characters (including spaces).
 *
 * @param {number} correctChars  - Count of correctly typed characters
 * @param {number} elapsedSecs   - Seconds elapsed since typing began
 * @returns {number} WPM rounded to nearest integer
 */
export function calculateWPM(correctChars, elapsedSecs) {
  if (elapsedSecs < 0.5) return 0; // avoid wild numbers at start
  const minutes = elapsedSecs / 60;
  const words = correctChars / 5;
  return Math.round(words / minutes);
}

/**
 * Calculate accuracy as a percentage.
 *
 * @param {number} correctChars   - Correctly typed characters
 * @param {number} totalKeystrokes - All keystrokes (including mistakes)
 * @returns {number} Percentage 0–100
 */
export function calculateAccuracy(correctChars, totalKeystrokes) {
  if (totalKeystrokes === 0) return 100;
  return Math.round((correctChars / totalKeystrokes) * 100);
}

/**
 * Calculate a "battle score" combining speed and accuracy.
 * Accuracy is weighted heavily to discourage panic-typing.
 *
 * Formula: score = WPM × (accuracy / 100)²
 *
 * @param {number} wpm
 * @param {number} accuracy  - 0–100
 * @returns {number} Score rounded to integer
 */
export function calculateBattleScore(wpm, accuracy) {
  const accuracyFactor = (accuracy / 100) ** 2;
  return Math.round(wpm * accuracyFactor);
}

/**
 * Determine a performance label from WPM.
 * Useful for the results screen.
 */
export function getSpeedLabel(wpm) {
  if (wpm >= 120) return { label: "Legendary",  color: "#FFD700" };
  if (wpm >= 90)  return { label: "Expert",     color: "#FF6B35" };
  if (wpm >= 70)  return { label: "Advanced",   color: "#A78BFA" };
  if (wpm >= 50)  return { label: "Intermediate", color: "#34D399" };
  if (wpm >= 30)  return { label: "Beginner",   color: "#60A5FA" };
  return              { label: "Learner",    color: "#9CA3AF" };
}

/**
 * Format elapsed seconds as mm:ss
 */
export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

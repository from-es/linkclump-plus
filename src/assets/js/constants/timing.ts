/**
 * Timing constants for timeouts, intervals, and unit conversions.
 */
export const MOUSEUP_BOUNCE_TIMEOUT_MS = 100 as const;  // Delay to filter bounce on mouseup
export const SCROLL_DETECT_INTERVAL_MS = 100 as const;  // Periodic interval for scroll detection
export const TOUCH_HOLD_TIMEOUT_MS = 500 as const;      // Delay to initiate touch selection mode
export const SECONDS_TO_MS = 1000 as const;             // Milliseconds per second conversion factor

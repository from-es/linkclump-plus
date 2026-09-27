/**
 * UI display constants: element dimensions, font specifications, z-index, and threshold values.
 */
export const Z_INDEX_BASE = 2147483647 as const;  // Maximum signed 32-bit integer for CSS z-index
export const CUSTOM_TAG_LINKCLUMP = "linkclump-plus" as const;

export const COUNTER_FONT_SIZE_DEFAULT = 16 as const;
export const COUNTER_FONT_SIZE_MIN = 8 as const;
export const COUNTER_FONT_SIZE_MAX = 64 as const;

export const COUNTER_FONT_WEIGHT_DEFAULT = 400 as const;
export const COUNTER_FONT_WEIGHT_MIN = 1 as const;
export const COUNTER_FONT_WEIGHT_MAX = 1000 as const;

export const DRAG_THRESHOLD_MIN_PX = 5 as const;             // Minimum pixel delta to initiate box drag detection
export const OPTIONS_TOOLTIP_LEFT_OFFSET_PX = 500 as const;  // Horizontal tooltip offset on options page

import type { MouseButtonType } from "@/assets/js/types/MouseButton";

/**
 * Mouse button code identifiers matching DOM MouseEvent.button standards.
 */
export const MOUSE_BUTTON_LEFT = 0 as const satisfies MouseButtonType;
export const MOUSE_BUTTON_MIDDLE = 1 as const satisfies MouseButtonType;
export const MOUSE_BUTTON_RIGHT = 2 as const satisfies MouseButtonType;
export const MOUSE_BUTTON_NONE = -1 as const satisfies MouseButtonType;

// Exhaustive check: verify that all values of union MouseButtonType are covered by MOUSE_BUTTON_* constants
type _Exhaustive = MouseButtonType extends
	| typeof MOUSE_BUTTON_LEFT
	| typeof MOUSE_BUTTON_MIDDLE
	| typeof MOUSE_BUTTON_RIGHT
	| typeof MOUSE_BUTTON_NONE
	? true
	: never;
const _check: _Exhaustive = true;
void _check;

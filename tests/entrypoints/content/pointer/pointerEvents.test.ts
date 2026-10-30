/**
 * pointerEvents Tests
 *
 * Verifies the pointer entry points: pointer/modifier state sync, synchronous context menu suppression,
 * immediate selection start for mouse input, the touch hold flow (arm, confirm, cancel on move/release,
 * extra fingers), and the contextmenu / touchmove handlers.
 * The selection lifecycle is mocked; matching and touch hold logic are real.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link project/tests/shared/types/validation.ts} - Standard type for validation tests
 */

import { describe, afterEach, beforeEach, vi } from "vitest";
import { contextmenu, pointerdown, touchmove } from "@/entrypoints/content/pointer/pointerEvents";
import { startSelection } from "@/entrypoints/content/selection/lifecycle";
import { cancelTouchHold, isTouchHoldArmed } from "@/entrypoints/content/touch/touchHold";
import { OS_LINUX, OS_MAC, OS_WIN } from "@/assets/js/constants/os";
import { KEY_CODE_ALT, KEY_CODE_CTRL, KEY_CODE_META, KEY_CODE_NONE, KEY_CODE_SHIFT } from "@/assets/js/constants/keyboard";
import { TOUCH_HOLD_TIMEOUT_MS } from "@/assets/js/constants/timing";
import { DRAG_THRESHOLD_MIN_PX } from "@/assets/js/constants/ui";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

vi.mock("@/entrypoints/content/selection/lifecycle", () => ({ startSelection: vi.fn() }));

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

type After =
	| { readonly type: "advance", readonly ms: number }
	| { readonly type: "move", readonly pointerId: number, readonly x: number, readonly y: number }
	| { readonly type: "up" }
	| { readonly type: "down", readonly event: Partial<PointerEvent> };

interface DownInput {
	readonly event: Partial<PointerEvent>;
	readonly os?: number;
	/** Left-click settings available as `window.settings`. */
	readonly settings?: Record<string, { mouse: number, key: number }>;
	/** Initial `window.stop_menu`. */
	readonly stopMenu?: boolean;
	/** Whether `startSelection` returns true (an action matched). */
	readonly selectionStarts?: boolean;
	/** Whether `navigator.vibrate` exists. */
	readonly vibrate?: boolean;
	readonly after?: readonly After[];
}

const MOUSE = { isTrusted: true, pointerType: "mouse", button: 0, isPrimary: true, pointerId: 1, pageX: 50, pageY: 60 } as const;
const TOUCH = { isTrusted: true, pointerType: "touch", button: 0, isPrimary: true, pointerId: 5, pageX: 50, pageY: 60 } as const;
const LEFT_NO_KEY = { 101: { mouse: 0, key: KEY_CODE_NONE } } as const;

const testData = {
	downCases: [
		{
			name: "should ignore untrusted events",
			input: { event: { ...MOUSE, isTrusted: false } },
			expected: { selections: [], pointerType: "initial", mouseButton: -9, keyPressed: 0, stopMenu: false, armed: false, touchActive: false, vibrations: 0 }
		},
		{
			name: "should record the pointer type and button and start the selection immediately for mouse input",
			input: { event: { ...MOUSE, button: 2 } },
			expected: { selections: [ [ 50, 60 ] ], pointerType: "mouse", mouseButton: 2, keyPressed: 0, stopMenu: false, armed: false, touchActive: false, vibrations: 0 }
		},
		{ name: "should sync Meta from the event", input: { event: { ...MOUSE, metaKey: true } }, expected: { selections: [ [ 50, 60 ] ], pointerType: "mouse", mouseButton: 0, keyPressed: KEY_CODE_META, stopMenu: false, armed: false, touchActive: false, vibrations: 0 } },
		{ name: "should sync Ctrl from the event when Meta is not held", input: { event: { ...MOUSE, ctrlKey: true } }, expected: { selections: [ [ 50, 60 ] ], pointerType: "mouse", mouseButton: 0, keyPressed: KEY_CODE_CTRL, stopMenu: false, armed: false, touchActive: false, vibrations: 0 } },
		{ name: "should sync Shift from the event", input: { event: { ...MOUSE, shiftKey: true } }, expected: { selections: [ [ 50, 60 ] ], pointerType: "mouse", mouseButton: 0, keyPressed: KEY_CODE_SHIFT, stopMenu: false, armed: false, touchActive: false, vibrations: 0 } },
		{ name: "should sync Alt from the event", input: { event: { ...MOUSE, altKey: true } }, expected: { selections: [ [ 50, 60 ] ], pointerType: "mouse", mouseButton: 0, keyPressed: KEY_CODE_ALT, stopMenu: false, armed: false, touchActive: false, vibrations: 0 } }
	],
	stopMenuCases: [
		{ name: "should set stop_menu to false on Windows", input: { event: { ...MOUSE, button: 2 }, os: OS_WIN, stopMenu: true, settings: { 101: { mouse: 2, key: KEY_CODE_NONE } } }, expected: false },
		{ name: "should set stop_menu to true on macOS when an action matches", input: { event: { ...MOUSE, button: 2 }, os: OS_MAC, settings: { 101: { mouse: 2, key: KEY_CODE_NONE } } }, expected: true },
		{ name: "should set stop_menu to false on macOS when no action matches", input: { event: { ...MOUSE, button: 2 }, os: OS_MAC, stopMenu: true, settings: { 101: { mouse: 0, key: KEY_CODE_NONE } } }, expected: false },
		{ name: "should leave stop_menu untouched on Linux (owned by keydown/keyup)", input: { event: { ...MOUSE, button: 2 }, os: OS_LINUX, stopMenu: true, settings: {} }, expected: true },
		{ name: "should leave stop_menu untouched for touch input", input: { event: { ...TOUCH }, os: OS_MAC, stopMenu: true, settings: {} }, expected: true }
	],
	touchCases: [
		{
			name: "should arm a hold instead of starting the selection for touch without a key",
			input: { event: { ...TOUCH }, settings: LEFT_NO_KEY },
			expected: { selections: [], pointerType: "touch", mouseButton: 0, keyPressed: 0, stopMenu: false, armed: true, touchActive: false, vibrations: 0 }
		},
		{
			name: "should start the selection and vibrate when the hold is confirmed",
			input: { event: { ...TOUCH }, settings: LEFT_NO_KEY, selectionStarts: true, vibrate: true, after: [ { type: "advance", ms: TOUCH_HOLD_TIMEOUT_MS } ] },
			expected: { selections: [ [ 50, 60 ] ], pointerType: "touch", mouseButton: 0, keyPressed: 0, stopMenu: false, armed: false, touchActive: true, vibrations: 1 }
		},
		{
			name: "should confirm without vibrating when the vibration API is unavailable",
			input: { event: { ...TOUCH }, settings: LEFT_NO_KEY, selectionStarts: true, vibrate: false, after: [ { type: "advance", ms: TOUCH_HOLD_TIMEOUT_MS } ] },
			expected: { selections: [ [ 50, 60 ] ], pointerType: "touch", mouseButton: 0, keyPressed: 0, stopMenu: false, armed: false, touchActive: true, vibrations: 0 }
		},
		{
			name: "should hand the gesture back to the browser when no action matches on confirmation",
			input: { event: { ...TOUCH }, settings: LEFT_NO_KEY, selectionStarts: false, vibrate: true, after: [ { type: "advance", ms: TOUCH_HOLD_TIMEOUT_MS } ] },
			expected: { selections: [ [ 50, 60 ] ], pointerType: "touch", mouseButton: 0, keyPressed: 0, stopMenu: false, armed: false, touchActive: false, vibrations: 0 }
		},
		{
			name: "should not arm a hold when there is no left-click action",
			input: { event: { ...TOUCH }, settings: { 101: { mouse: 2, key: KEY_CODE_NONE } }, after: [ { type: "advance", ms: TOUCH_HOLD_TIMEOUT_MS } ] },
			expected: { selections: [], pointerType: "touch", mouseButton: 0, keyPressed: 0, stopMenu: false, armed: false, touchActive: false, vibrations: 0 }
		},
		{
			name: "should cancel the hold when the finger moves beyond the threshold",
			input: { event: { ...TOUCH }, settings: LEFT_NO_KEY, selectionStarts: true, after: [ { type: "move", pointerId: 5, x: 50 + DRAG_THRESHOLD_MIN_PX + 1, y: 60 }, { type: "advance", ms: TOUCH_HOLD_TIMEOUT_MS } ] },
			expected: { selections: [], pointerType: "touch", mouseButton: 0, keyPressed: 0, stopMenu: false, armed: false, touchActive: false, vibrations: 0 }
		},
		{
			name: "should keep the hold when the finger moves within the threshold",
			input: { event: { ...TOUCH }, settings: LEFT_NO_KEY, selectionStarts: true, after: [ { type: "move", pointerId: 5, x: 50 + DRAG_THRESHOLD_MIN_PX, y: 60 }, { type: "advance", ms: TOUCH_HOLD_TIMEOUT_MS } ] },
			expected: { selections: [ [ 50, 60 ] ], pointerType: "touch", mouseButton: 0, keyPressed: 0, stopMenu: false, armed: false, touchActive: true, vibrations: 0 }
		},
		{
			name: "should ignore the movement of another finger",
			input: { event: { ...TOUCH }, settings: LEFT_NO_KEY, selectionStarts: true, after: [ { type: "move", pointerId: 99, x: 5000, y: 5000 }, { type: "advance", ms: TOUCH_HOLD_TIMEOUT_MS } ] },
			expected: { selections: [ [ 50, 60 ] ], pointerType: "touch", mouseButton: 0, keyPressed: 0, stopMenu: false, armed: false, touchActive: true, vibrations: 0 }
		},
		{
			name: "should cancel the hold when the finger is released before the timeout",
			input: { event: { ...TOUCH }, settings: LEFT_NO_KEY, selectionStarts: true, after: [ { type: "up" }, { type: "advance", ms: TOUCH_HOLD_TIMEOUT_MS } ] },
			expected: { selections: [], pointerType: "touch", mouseButton: 0, keyPressed: 0, stopMenu: false, armed: false, touchActive: false, vibrations: 0 }
		},
		{
			name: "should discard a pending hold when a second finger touches down",
			input: { event: { ...TOUCH }, settings: LEFT_NO_KEY, selectionStarts: true, after: [ { type: "down", event: { ...TOUCH, pointerId: 6, isPrimary: false } }, { type: "advance", ms: TOUCH_HOLD_TIMEOUT_MS } ] },
			expected: { selections: [], pointerType: "touch", mouseButton: 0, keyPressed: 0, stopMenu: false, armed: false, touchActive: false, vibrations: 0 }
		},
		{
			name: "should start the selection immediately for touch with a key held",
			input: { event: { ...TOUCH, ctrlKey: true }, settings: LEFT_NO_KEY },
			expected: { selections: [ [ 50, 60 ] ], pointerType: "touch", mouseButton: 0, keyPressed: KEY_CODE_CTRL, stopMenu: false, armed: false, touchActive: false, vibrations: 0 }
		}
	],
	contextMenuCases: [
		{ name: "should prevent the menu while stop_menu is set", input: { trusted: true, stopMenu: true, pointerType: "mouse", armed: false, touchActive: false }, expected: true },
		{ name: "should not prevent the menu when nothing is in progress", input: { trusted: true, stopMenu: false, pointerType: "mouse", armed: false, touchActive: false }, expected: false },
		{ name: "should prevent the long-press menu while a touch hold is pending", input: { trusted: true, stopMenu: false, pointerType: "touch", armed: true, touchActive: false }, expected: true },
		{ name: "should prevent the long-press menu while a touch hold is active", input: { trusted: true, stopMenu: false, pointerType: "touch", armed: false, touchActive: true }, expected: true },
		{ name: "should not treat a mouse pointer as a touch hold", input: { trusted: true, stopMenu: false, pointerType: "mouse", armed: false, touchActive: true }, expected: false },
		{ name: "should ignore untrusted events", input: { trusted: false, stopMenu: true, pointerType: "mouse", armed: false, touchActive: false }, expected: false }
	],
	touchMoveCases: [
		{ name: "should prevent panning while the touch selection is active", input: { touchActive: true, cancelable: true }, expected: true },
		{ name: "should not prevent panning when the touch selection is inactive", input: { touchActive: false, cancelable: true }, expected: false },
		{ name: "should not prevent a non-cancelable event", input: { touchActive: true, cancelable: false }, expected: false }
	]
} as const satisfies Record<string, readonly TestCase[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

/**
 * Dispatches a synthetic pointer event on `window` (listeners are registered there in capture phase).
 *
 * @param {string} type - Event type.
 * @param {object} props - Properties copied onto the event.
 */
function dispatchOnWindow(type: string, props: object = {}): void {
	window.dispatchEvent(Object.assign(new Event(type), props));
}

describe("pointerEvents", () => {
	beforeEach(() => {
		// Arrange: Neutral state; fake timers drive the touch hold timeout
		vi.useFakeTimers();
		vi.clearAllMocks();
		window.os = OS_WIN;
		window.pointer_type = "initial";
		window.mouse_button = -9;
		window.key_pressed = 0;
		window.stop_menu = false;
		window.touch_active = false;
		window.settings = {} as IntentionalAnyForValidation;
	});

	afterEach(() => {
		cancelTouchHold();
		Reflect.deleteProperty(navigator, "vibrate");
		vi.useRealTimers();
	});

	/**
	 * Runs pointerdown (plus the follow-up steps of the case) and reports the resulting state.
	 *
	 * @param {DownInput} input - Case input.
	 * @returns The state snapshot.
	 */
	const run = ({ event, os, settings, stopMenu, selectionStarts, vibrate, after }: DownInput) => {
		window.os = (os ?? OS_WIN) as typeof window.os;
		window.settings = (settings ?? {}) as IntentionalAnyForValidation;
		window.stop_menu = stopMenu ?? false;
		vi.mocked(startSelection).mockReturnValue(selectionStarts ?? true);
		const vibrateSpy = vi.fn();
		if (vibrate !== undefined) {
			Object.defineProperty(navigator, "vibrate", { configurable: true, value: vibrate ? vibrateSpy : undefined });
		}

		pointerdown(event as PointerEvent);

		for (const step of after ?? []) {
			if (step.type === "advance") {
				vi.advanceTimersByTime(step.ms);
			} else if (step.type === "move") {
				dispatchOnWindow("pointermove", { pointerId: step.pointerId, pageX: step.x, pageY: step.y });
			} else if (step.type === "up") {
				dispatchOnWindow("pointerup");
			} else {
				pointerdown(step.event as PointerEvent);
			}
		}

		return {
			selections: vi.mocked(startSelection).mock.calls.map(([ , x, y ]) => [ x, y ]),
			pointerType: window.pointer_type,
			mouseButton: window.mouse_button,
			keyPressed: window.key_pressed,
			stopMenu: window.stop_menu,
			armed: isTouchHoldArmed(),
			touchActive: window.touch_active,
			vibrations: vibrateSpy.mock.calls.length
		};
	};

	describe("pointerdown (state sync and mouse)", () => {
		TestRunner.success(testData.downCases, undefined, run);
	});

	describe("pointerdown (context menu suppression)", () => {
		TestRunner.success(testData.stopMenuCases, undefined, (input: DownInput) => run(input).stopMenu, { matcher: "toBe" });
	});

	describe("pointerdown (touch hold)", () => {
		TestRunner.success(testData.touchCases, undefined, run);
	});

	describe("contextmenu", () => {
		TestRunner.success(testData.contextMenuCases, undefined, ({ trusted, stopMenu, pointerType, armed, touchActive }: { trusted: boolean, stopMenu: boolean, pointerType: string, armed: boolean, touchActive: boolean }) => {
			window.stop_menu = stopMenu;
			window.pointer_type = pointerType;
			window.touch_active = touchActive;
			if (armed) {
				// Arm a real hold through a touch pointerdown
				window.settings = LEFT_NO_KEY as IntentionalAnyForValidation;
				pointerdown(TOUCH as unknown as PointerEvent);
				window.pointer_type = pointerType;
			}
			const event = { isTrusted: trusted, preventDefault: vi.fn() };

			contextmenu(event as unknown as MouseEvent);

			return event.preventDefault.mock.calls.length > 0;
		}, { matcher: "toBe" });
	});

	describe("touchmove", () => {
		TestRunner.success(testData.touchMoveCases, undefined, ({ touchActive, cancelable }: { touchActive: boolean, cancelable: boolean }) => {
			window.touch_active = touchActive;
			const event = { cancelable, preventDefault: vi.fn() };

			touchmove(event as unknown as TouchEvent);

			return event.preventDefault.mock.calls.length > 0;
		}, { matcher: "toBe" });
	});
});

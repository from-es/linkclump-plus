/**
 * allowSelection Tests
 *
 * Verifies how the current pointer/key state is matched against the configured actions
 * (including touch hold and macOS Ctrl+Left-Click emulation), the box/counter styling applied on a match,
 * and the DOM-free helpers used to decide context menu suppression at pointerdown time.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link project/tests/shared/types/validation.ts} - Standard type for validation tests
 */

import { describe, afterEach, beforeEach, vi } from "vitest";
import {
	allowSelection,
	computeStopMenuOnPointerDown,
	findMatchingMouseKeySetting,
	findTouchSettingId,
	isMacCtrlLeftClickEmulated,
	isMouseKeyMatch,
	type RawPointerState
} from "@/entrypoints/content/matching/allowSelection";
import { OS_LINUX, OS_MAC, OS_WIN } from "@/assets/js/constants/os";
import { MOUSE_BUTTON_LEFT, MOUSE_BUTTON_MIDDLE, MOUSE_BUTTON_RIGHT } from "@/assets/js/constants/mouseButton";
import { KEY_CODE_ALT, KEY_CODE_CTRL, KEY_CODE_META, KEY_CODE_NONE, KEY_CODE_SHIFT } from "@/assets/js/constants/keyboard";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

/** Minimal action shape: only the fields that matching reads. */
type SettingLike = { mouse: number | string, key: number | string, color?: unknown, options?: Record<string, unknown> };
type SettingsLike = Record<string, SettingLike>;

interface MatchInput {
	readonly settings: SettingsLike;
	readonly os?: number;
	readonly mouseButton?: number | null;
	readonly keyPressed?: number;
	readonly pointerType?: string | null;
	readonly touchActive?: boolean;
	/** Modifier flags of the PointerEvent passed to allowSelection (omitted = no event). */
	readonly event?: { readonly metaKey?: boolean, readonly ctrlKey?: boolean, readonly shiftKey?: boolean, readonly altKey?: boolean };
}

interface StyleInput {
	readonly setting: SettingLike;
}

const LEFT_SHIFT: SettingsLike = { 101: { mouse: MOUSE_BUTTON_LEFT, key: KEY_CODE_SHIFT } };

const testData = {
	touchSettingCases: [
		{ name: "should return undefined when there are no settings", input: {}, expected: undefined },
		{ name: "should return undefined when there is no left-click setting", input: { 101: { mouse: MOUSE_BUTTON_RIGHT, key: KEY_CODE_NONE } }, expected: undefined },
		{ name: "should prefer a left-click setting without a key", input: { 101: { mouse: MOUSE_BUTTON_LEFT, key: KEY_CODE_SHIFT }, 102: { mouse: MOUSE_BUTTON_LEFT, key: KEY_CODE_NONE } }, expected: "102" },
		{ name: "should fall back to the first left-click setting that needs a key", input: { 101: { mouse: MOUSE_BUTTON_RIGHT, key: KEY_CODE_NONE }, 102: { mouse: MOUSE_BUTTON_LEFT, key: KEY_CODE_CTRL }, 103: { mouse: MOUSE_BUTTON_LEFT, key: KEY_CODE_SHIFT } }, expected: "102" },
		{ name: "should compare numeric strings as numbers", input: { 101: { mouse: "0", key: "0" } }, expected: "101" }
	],
	matchCases: [
		{ name: "should match a setting with the same mouse button and key", input: { settings: LEFT_SHIFT, os: OS_WIN, mouseButton: MOUSE_BUTTON_LEFT, keyPressed: KEY_CODE_SHIFT }, expected: { matched: true, setting: 101 } },
		{ name: "should not match when the key differs", input: { settings: LEFT_SHIFT, os: OS_WIN, mouseButton: MOUSE_BUTTON_LEFT, keyPressed: KEY_CODE_CTRL }, expected: { matched: false, setting: 0 } },
		{ name: "should not match when the mouse button differs", input: { settings: LEFT_SHIFT, os: OS_WIN, mouseButton: MOUSE_BUTTON_RIGHT, keyPressed: KEY_CODE_SHIFT }, expected: { matched: false, setting: 0 } },
		{ name: "should match numeric strings stored in settings", input: { settings: { 101: { mouse: "0", key: "16" } }, os: OS_WIN, mouseButton: MOUSE_BUTTON_LEFT, keyPressed: KEY_CODE_SHIFT }, expected: { matched: true, setting: 101 } },
		{ name: "should select the first matching setting", input: { settings: { 101: { mouse: MOUSE_BUTTON_LEFT, key: KEY_CODE_SHIFT }, 102: { mouse: MOUSE_BUTTON_LEFT, key: KEY_CODE_SHIFT } }, os: OS_WIN, mouseButton: MOUSE_BUTTON_LEFT, keyPressed: KEY_CODE_SHIFT }, expected: { matched: true, setting: 101 } },
		{ name: "should return false when there are no settings", input: { settings: {}, os: OS_WIN, mouseButton: MOUSE_BUTTON_LEFT, keyPressed: KEY_CODE_SHIFT }, expected: { matched: false, setting: 0 } },
		{
			name: "should treat the emulated right click with Ctrl on macOS as Left + Ctrl",
			input: { settings: { 101: { mouse: MOUSE_BUTTON_LEFT, key: KEY_CODE_CTRL } }, os: OS_MAC, mouseButton: MOUSE_BUTTON_RIGHT, keyPressed: KEY_CODE_CTRL },
			expected: { matched: true, setting: 101 }
		},
		{
			name: "should not apply the macOS emulation on other platforms",
			input: { settings: { 101: { mouse: MOUSE_BUTTON_LEFT, key: KEY_CODE_CTRL } }, os: OS_WIN, mouseButton: MOUSE_BUTTON_RIGHT, keyPressed: KEY_CODE_CTRL },
			expected: { matched: false, setting: 0 }
		},
		{
			name: "should match the preferred setting for a confirmed touch hold without a physical key",
			input: { settings: { 101: { mouse: MOUSE_BUTTON_LEFT, key: KEY_CODE_SHIFT }, 102: { mouse: MOUSE_BUTTON_LEFT, key: KEY_CODE_NONE } }, os: OS_WIN, mouseButton: null, keyPressed: 0, pointerType: "touch", touchActive: true },
			expected: { matched: true, setting: 102 }
		},
		{
			name: "should not match by touch when the hold is not confirmed yet",
			input: { settings: { 102: { mouse: MOUSE_BUTTON_LEFT, key: KEY_CODE_NONE } }, os: OS_WIN, mouseButton: MOUSE_BUTTON_MIDDLE, keyPressed: 1, pointerType: "touch", touchActive: false },
			expected: { matched: false, setting: 0 }
		}
	],
	eventSyncCases: [
		{ name: "should re-sync Meta from the event when no key is tracked", input: { settings: { 101: { mouse: MOUSE_BUTTON_LEFT, key: KEY_CODE_META } }, os: OS_MAC, mouseButton: MOUSE_BUTTON_LEFT, keyPressed: 0, event: { metaKey: true } }, expected: { matched: true, setting: 101 } },
		{ name: "should re-sync Ctrl from the event when no key is tracked", input: { settings: { 101: { mouse: MOUSE_BUTTON_LEFT, key: KEY_CODE_CTRL } }, os: OS_WIN, mouseButton: MOUSE_BUTTON_LEFT, keyPressed: 0, event: { ctrlKey: true } }, expected: { matched: true, setting: 101 } },
		{ name: "should re-sync Shift from the event when no key is tracked", input: { settings: LEFT_SHIFT, os: OS_WIN, mouseButton: MOUSE_BUTTON_LEFT, keyPressed: 0, event: { shiftKey: true } }, expected: { matched: true, setting: 101 } },
		{ name: "should re-sync Alt from the event when no key is tracked", input: { settings: { 101: { mouse: MOUSE_BUTTON_LEFT, key: KEY_CODE_ALT } }, os: OS_WIN, mouseButton: MOUSE_BUTTON_LEFT, keyPressed: 0, event: { altKey: true } }, expected: { matched: true, setting: 101 } },
		{ name: "should not override a key that is already tracked", input: { settings: LEFT_SHIFT, os: OS_WIN, mouseButton: MOUSE_BUTTON_LEFT, keyPressed: KEY_CODE_CTRL, event: { shiftKey: true } }, expected: { matched: false, setting: 0 } },
		{ name: "should prefer Meta over other modifiers", input: { settings: { 101: { mouse: MOUSE_BUTTON_LEFT, key: KEY_CODE_META } }, os: OS_MAC, mouseButton: MOUSE_BUTTON_LEFT, keyPressed: 0, event: { metaKey: true, ctrlKey: true, shiftKey: true } }, expected: { matched: true, setting: 101 } }
	],
	stylingCases: [
		{
			name: "should apply the action color to the box border and invert the counter when samebgcolorasbox is true",
			input: { setting: { mouse: 0, key: 16, color: "#ff0000", options: { samebgcolorasbox: true, fontsizeofcounter: 20, fontweightofcounter: 700 } } },
			expected: {
				border: "2px dotted rgb(255, 0, 0)", color: "white", borderColor: "white", backgroundColor: "rgb(255, 0, 0)",
				fontSize: "20px", lineHeight: "20px", padding: "10px", borderWidth: "5px", borderRadius: "10px", fontWeight: "700", warnings: 0
			}
		},
		{
			name: "should make the counter transparent when samebgcolorasbox is false",
			input: { setting: { mouse: 0, key: 16, color: "#00ff00", options: { samebgcolorasbox: false, fontsizeofcounter: 16, fontweightofcounter: 400 } } },
			expected: {
				border: "2px dotted rgb(0, 255, 0)", color: "black", borderColor: "transparent", backgroundColor: "transparent",
				fontSize: "16px", lineHeight: "16px", padding: "8px", borderWidth: "4px", borderRadius: "8px", fontWeight: "400", warnings: 0
			}
		},
		{
			name: "should warn and leave the font size unchanged when fontsizeofcounter is invalid",
			input: { setting: { mouse: 0, key: 16, color: "red", options: { samebgcolorasbox: false, fontsizeofcounter: "big", fontweightofcounter: 400 } } },
			expected: {
				border: "2px dotted red", color: "black", borderColor: "transparent", backgroundColor: "transparent",
				fontSize: "", lineHeight: "", padding: "", borderWidth: "", borderRadius: "", fontWeight: "400", warnings: 1
			}
		},
		{
			name: "should warn and leave the font weight unchanged when fontweightofcounter is out of range",
			input: { setting: { mouse: 0, key: 16, color: "red", options: { samebgcolorasbox: false, fontsizeofcounter: 16, fontweightofcounter: 5000 } } },
			expected: {
				border: "2px dotted red", color: "black", borderColor: "transparent", backgroundColor: "transparent",
				fontSize: "16px", lineHeight: "16px", padding: "8px", borderWidth: "4px", borderRadius: "8px", fontWeight: "", warnings: 1
			}
		},
		{
			name: "should fall back to red for the border when the action has no color",
			input: { setting: { mouse: 0, key: 16, options: { fontsizeofcounter: 16, fontweightofcounter: 400 } } },
			expected: {
				border: "2px dotted red", color: "", borderColor: "", backgroundColor: "",
				fontSize: "16px", lineHeight: "16px", padding: "8px", borderWidth: "4px", borderRadius: "8px", fontWeight: "400", warnings: 0
			}
		},
		{
			name: "should not warn when counter font options are omitted",
			input: { setting: { mouse: 0, key: 16, options: {} } },
			expected: {
				border: "2px dotted red", color: "", borderColor: "", backgroundColor: "",
				fontSize: "", lineHeight: "", padding: "", borderWidth: "", borderRadius: "", fontWeight: "", warnings: 0
			}
		}
	],
	stopMenuCases: [
		{ name: "should return null for touch input", input: { state: { os: OS_MAC, mouseButton: 0, ctrlKey: false, keyPressed: 0, pointerType: "touch" }, matching: null }, expected: null },
		{ name: "should return null on Linux (owned by keydown/keyup)", input: { state: { os: OS_LINUX, mouseButton: 2, ctrlKey: false, keyPressed: KEY_CODE_CTRL, pointerType: "mouse" }, matching: { mouse: 2, key: KEY_CODE_CTRL } }, expected: null },
		{ name: "should return false on Windows even when a setting matches", input: { state: { os: OS_WIN, mouseButton: 2, ctrlKey: false, keyPressed: 0, pointerType: "mouse" }, matching: { mouse: 2, key: 0 } }, expected: false },
		{ name: "should return true on macOS when the matching setting still matches the state", input: { state: { os: OS_MAC, mouseButton: 2, ctrlKey: false, keyPressed: KEY_CODE_SHIFT, pointerType: "mouse" }, matching: { mouse: 2, key: KEY_CODE_SHIFT } }, expected: true },
		{ name: "should return false on macOS when no setting matches", input: { state: { os: OS_MAC, mouseButton: 2, ctrlKey: false, keyPressed: 0, pointerType: "mouse" }, matching: null }, expected: false },
		{ name: "should return true on macOS for the emulated Ctrl+Left-Click", input: { state: { os: OS_MAC, mouseButton: 2, ctrlKey: true, keyPressed: KEY_CODE_CTRL, pointerType: "mouse" }, matching: { mouse: 0, key: KEY_CODE_CTRL } }, expected: true }
	],
	emulatedCases: [
		{ name: "should detect Ctrl + right button on macOS as emulated Left-Click", input: { os: OS_MAC, mouseButton: MOUSE_BUTTON_RIGHT, ctrlKey: true, keyPressed: 0, pointerType: "mouse" }, expected: true },
		{ name: "should not detect it without Ctrl", input: { os: OS_MAC, mouseButton: MOUSE_BUTTON_RIGHT, ctrlKey: false, keyPressed: 0, pointerType: "mouse" }, expected: false },
		{ name: "should not detect it for the left button", input: { os: OS_MAC, mouseButton: MOUSE_BUTTON_LEFT, ctrlKey: true, keyPressed: 0, pointerType: "mouse" }, expected: false },
		{ name: "should not detect it on other platforms", input: { os: OS_WIN, mouseButton: MOUSE_BUTTON_RIGHT, ctrlKey: true, keyPressed: 0, pointerType: "mouse" }, expected: false }
	],
	mouseKeyCases: [
		{ name: "should match the same button and key", input: { state: { os: OS_WIN, mouseButton: 0, ctrlKey: false, keyPressed: KEY_CODE_SHIFT, pointerType: "mouse" }, setting: { mouse: 0, key: KEY_CODE_SHIFT } }, expected: true },
		{ name: "should not match a different key", input: { state: { os: OS_WIN, mouseButton: 0, ctrlKey: false, keyPressed: KEY_CODE_CTRL, pointerType: "mouse" }, setting: { mouse: 0, key: KEY_CODE_SHIFT } }, expected: false },
		{ name: "should match Left setting with the emulated click on macOS", input: { state: { os: OS_MAC, mouseButton: 2, ctrlKey: true, keyPressed: KEY_CODE_CTRL, pointerType: "mouse" }, setting: { mouse: 0, key: KEY_CODE_CTRL } }, expected: true },
		{ name: "should still match a Right setting for the same emulated click", input: { state: { os: OS_MAC, mouseButton: 2, ctrlKey: true, keyPressed: KEY_CODE_CTRL, pointerType: "mouse" }, setting: { mouse: 2, key: KEY_CODE_CTRL } }, expected: true },
		{ name: "should not match a Middle setting for the emulated click", input: { state: { os: OS_MAC, mouseButton: 2, ctrlKey: true, keyPressed: KEY_CODE_CTRL, pointerType: "mouse" }, setting: { mouse: 1, key: KEY_CODE_CTRL } }, expected: false }
	],
	findMouseKeyCases: [
		{ name: "should return the first matching button+key pair", input: { settings: { 101: { mouse: 0, key: KEY_CODE_CTRL }, 102: { mouse: 0, key: KEY_CODE_SHIFT } }, state: { os: OS_WIN, mouseButton: 0, ctrlKey: false, keyPressed: KEY_CODE_SHIFT, pointerType: "mouse" } }, expected: { mouse: 0, key: KEY_CODE_SHIFT } },
		{ name: "should normalize numeric strings to numbers", input: { settings: { 101: { mouse: "2", key: "17" } }, state: { os: OS_WIN, mouseButton: 2, ctrlKey: false, keyPressed: KEY_CODE_CTRL, pointerType: "mouse" } }, expected: { mouse: 2, key: KEY_CODE_CTRL } },
		{ name: "should return null when nothing matches", input: { settings: { 101: { mouse: 0, key: KEY_CODE_CTRL } }, state: { os: OS_WIN, mouseButton: 2, ctrlKey: false, keyPressed: 0, pointerType: "mouse" } }, expected: null }
	]
} as const satisfies Record<string, readonly TestCase[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

/**
 * Replaces `window.settings` with the given actions.
 *
 * @param {SettingsLike} settings - Actions to expose to the content script.
 */
function setSettings(settings: SettingsLike): void {
	window.settings = settings as IntentionalAnyForValidation;
}

describe("allowSelection", () => {
	beforeEach(() => {
		// Arrange: Neutral pointer state, no box (styling is only applied when a box exists)
		vi.clearAllMocks();
		vi.spyOn(console, "warn").mockImplementation(() => {});
		window.os = OS_WIN;
		window.mouse_button = MOUSE_BUTTON_LEFT;
		window.key_pressed = 0;
		window.pointer_type = "mouse";
		window.touch_active = false;
		window.setting = 0;
		window.box = null as IntentionalAnyForValidation;
		setSettings({});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("findTouchSettingId", () => {
		TestRunner.success(testData.touchSettingCases, undefined, (settings) => {
			setSettings(settings as SettingsLike);

			return findTouchSettingId();
		}, { matcher: "toBe" });
	});

	/**
	 * Applies the pointer/key state of a case to `window` and runs allowSelection.
	 *
	 * @param {MatchInput} input - Case input.
	 * @returns The match result and the selected setting id.
	 */
	const match = ({ settings, os, mouseButton, keyPressed, pointerType, touchActive, event }: MatchInput) => {
		setSettings(settings);
		window.os = (os ?? OS_WIN) as typeof window.os;
		window.mouse_button = mouseButton === undefined ? MOUSE_BUTTON_LEFT : mouseButton;
		window.key_pressed = keyPressed ?? 0;
		window.pointer_type = pointerType ?? "mouse";
		window.touch_active = touchActive ?? false;

		const matched = allowSelection(event as PointerEvent | undefined);

		return { matched, setting: window.setting };
	};

	describe("Matching", () => {
		TestRunner.success(testData.matchCases, undefined, match);
	});

	describe("Modifier re-sync from the pointer event", () => {
		TestRunner.success(testData.eventSyncCases, undefined, match);
	});

	describe("Box and counter styling", () => {
		TestRunner.success(testData.stylingCases, undefined, ({ setting }: StyleInput) => {
			const box = document.createElement("div");
			const countLabel = document.createElement("div");
			window.box = box as IntentionalAnyForValidation;
			window.count_label = countLabel;
			setSettings({ 101: setting });
			window.mouse_button = MOUSE_BUTTON_LEFT;
			window.key_pressed = KEY_CODE_SHIFT;

			allowSelection();

			const style = countLabel.style;

			return {
				border: box.style.border,
				color: style.color,
				borderColor: style.borderColor,
				backgroundColor: style.backgroundColor,
				fontSize: style.fontSize,
				lineHeight: style.lineHeight,
				padding: style.padding,
				borderWidth: style.borderWidth,
				borderRadius: style.borderRadius,
				fontWeight: style.fontWeight,
				warnings: vi.mocked(console.warn).mock.calls.length
			};
		});
	});

	describe("isMacCtrlLeftClickEmulated", () => {
		TestRunner.success(testData.emulatedCases, undefined, (state: RawPointerState) => isMacCtrlLeftClickEmulated(state), { matcher: "toBe" });
	});

	describe("isMouseKeyMatch", () => {
		TestRunner.success(testData.mouseKeyCases, undefined, ({ state, setting }: { state: RawPointerState, setting: { mouse: number, key: number } }) => isMouseKeyMatch(state, setting), { matcher: "toBe" });
	});

	describe("findMatchingMouseKeySetting", () => {
		TestRunner.success(testData.findMouseKeyCases, undefined, ({ settings, state }: { settings: SettingsLike, state: RawPointerState }) => {
			setSettings(settings);

			return findMatchingMouseKeySetting(state);
		});
	});

	describe("computeStopMenuOnPointerDown", () => {
		TestRunner.success(testData.stopMenuCases, undefined, ({ state, matching }: { state: RawPointerState, matching: { mouse: number, key: number } | null }) => computeStopMenuOnPointerDown(state, matching), { matcher: "toBe" });
	});
});

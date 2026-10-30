/**
 * keyState Tests
 *
 * Verifies modifier key tracking (including Meta key normalization), the Linux context menu suppression flag,
 * Home/End handling, selection cancellation on window blur, and rejection of untrusted events.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link project/tests/shared/types/validation.ts} - Standard type for validation tests
 */

import { describe, beforeEach, vi } from "vitest";
import { allowKey, blur, keydown, keyup, removeKey } from "@/entrypoints/content/keyboard/keyState";
import { stop } from "@/entrypoints/content/selection/lifecycle";
import { OS_LINUX, OS_WIN } from "@/assets/js/constants/os";
import { KEY_CODE_CTRL, KEY_CODE_META, KEY_CODE_META_FIREFOX_MAC, KEY_CODE_META_RIGHT, KEY_CODE_SHIFT } from "@/assets/js/constants/keyboard";
import type { OsType } from "@/assets/js/types/OS";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

vi.mock("@/entrypoints/content/selection/lifecycle", () => ({ stop: vi.fn() }));

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface KeyInput {
	readonly event: Partial<KeyboardEvent>;
	readonly os: OsType;
	/** Key codes used as triggers by the configured actions. */
	readonly configuredKeys?: readonly number[];
}

interface BlurInput {
	readonly trusted: boolean;
	readonly onWindow: boolean;
	readonly boxOn: boolean;
}

const testData = {
	keydownCases: [
		{
			name: "should track a plain key code",
			input: { event: { isTrusted: true, keyCode: KEY_CODE_SHIFT, key: "Shift", code: "ShiftLeft" }, os: OS_WIN },
			expected: { keyPressed: KEY_CODE_SHIFT, stopMenu: false, scrollBugIgnore: false }
		},
		{
			name: "should normalize event.key 'Meta' to KEY_CODE_META",
			input: { event: { isTrusted: true, keyCode: 0, key: "Meta", code: "" }, os: OS_WIN },
			expected: { keyPressed: KEY_CODE_META, stopMenu: false, scrollBugIgnore: false }
		},
		{
			name: "should normalize event.code 'MetaRight' to KEY_CODE_META",
			input: { event: { isTrusted: true, keyCode: 0, key: "", code: "MetaRight" }, os: OS_WIN },
			expected: { keyPressed: KEY_CODE_META, stopMenu: false, scrollBugIgnore: false }
		},
		{
			name: "should normalize the right Meta key code to KEY_CODE_META",
			input: { event: { isTrusted: true, keyCode: KEY_CODE_META_RIGHT, key: "", code: "" }, os: OS_WIN },
			expected: { keyPressed: KEY_CODE_META, stopMenu: false, scrollBugIgnore: false }
		},
		{
			name: "should normalize the Firefox-on-Mac Meta key code to KEY_CODE_META",
			input: { event: { isTrusted: true, keyCode: KEY_CODE_META_FIREFOX_MAC, key: "", code: "" }, os: OS_WIN },
			expected: { keyPressed: KEY_CODE_META, stopMenu: false, scrollBugIgnore: false }
		},
		{
			name: "should suppress the context menu on Linux when the key is used by an action",
			input: { event: { isTrusted: true, keyCode: KEY_CODE_CTRL, key: "Control", code: "ControlLeft" }, os: OS_LINUX, configuredKeys: [ KEY_CODE_CTRL ] },
			expected: { keyPressed: KEY_CODE_CTRL, stopMenu: true, scrollBugIgnore: false }
		},
		{
			name: "should not suppress the context menu on Linux when no action uses the key",
			input: { event: { isTrusted: true, keyCode: KEY_CODE_CTRL, key: "Control", code: "ControlLeft" }, os: OS_LINUX, configuredKeys: [ KEY_CODE_SHIFT ] },
			expected: { keyPressed: KEY_CODE_CTRL, stopMenu: false, scrollBugIgnore: false }
		},
		{
			name: "should not suppress the context menu on non-Linux even when an action uses the key",
			input: { event: { isTrusted: true, keyCode: KEY_CODE_CTRL, key: "Control", code: "ControlLeft" }, os: OS_WIN, configuredKeys: [ KEY_CODE_CTRL ] },
			expected: { keyPressed: KEY_CODE_CTRL, stopMenu: false, scrollBugIgnore: false }
		},
		{
			name: "should ignore Home and End (scroll bug workaround) without tracking them",
			input: { event: { isTrusted: true, keyCode: 36, key: "Home", code: "Home" }, os: OS_WIN },
			expected: { keyPressed: 0, stopMenu: false, scrollBugIgnore: true }
		},
		{
			name: "should ignore End the same way as Home",
			input: { event: { isTrusted: true, keyCode: 35, key: "End", code: "End" }, os: OS_WIN },
			expected: { keyPressed: 0, stopMenu: false, scrollBugIgnore: true }
		},
		{
			name: "should ignore untrusted (synthesized) events",
			input: { event: { isTrusted: false, keyCode: KEY_CODE_SHIFT, key: "Shift", code: "ShiftLeft" }, os: OS_WIN },
			expected: { keyPressed: 0, stopMenu: false, scrollBugIgnore: false }
		}
	],
	keyupCases: [
		{ name: "should clear the tracked key when a normal key is released", input: { event: { isTrusted: true, code: "ShiftLeft" }, os: OS_WIN }, expected: { keyPressed: 0, stopMenu: false } },
		{ name: "should clear the Linux menu suppression when the key is released", input: { event: { isTrusted: true, code: "ControlLeft" }, os: OS_LINUX }, expected: { keyPressed: 0, stopMenu: false } },
		{ name: "should keep the tracked key when Home is released", input: { event: { isTrusted: true, code: "Home" }, os: OS_WIN }, expected: { keyPressed: KEY_CODE_SHIFT, stopMenu: false } },
		{ name: "should keep the tracked key when End is released", input: { event: { isTrusted: true, code: "End" }, os: OS_WIN }, expected: { keyPressed: KEY_CODE_SHIFT, stopMenu: false } },
		{ name: "should ignore untrusted keyup events", input: { event: { isTrusted: false, code: "ShiftLeft" }, os: OS_WIN }, expected: { keyPressed: KEY_CODE_SHIFT, stopMenu: false } }
	],
	blurCases: [
		{ name: "should cancel an active selection when the window loses focus", input: { trusted: true, onWindow: true, boxOn: true }, expected: { keyPressed: 0, stopCalls: 1 } },
		{ name: "should only clear the key when the window loses focus without an active selection", input: { trusted: true, onWindow: true, boxOn: false }, expected: { keyPressed: 0, stopCalls: 0 } },
		{ name: "should not cancel the selection when an element (not the window) loses focus", input: { trusted: true, onWindow: false, boxOn: true }, expected: { keyPressed: 0, stopCalls: 0 } },
		{ name: "should ignore untrusted blur events", input: { trusted: false, onWindow: true, boxOn: true }, expected: { keyPressed: KEY_CODE_SHIFT, stopCalls: 0 } }
	],
	allowKeyCases: [
		{ name: "should return true when an action uses the key (numeric)", input: { configured: [ KEY_CODE_CTRL ], keyCode: KEY_CODE_CTRL }, expected: true },
		{ name: "should compare numeric strings as numbers", input: { configured: [ "17" ], keyCode: 17 }, expected: true },
		{ name: "should return false when no action uses the key", input: { configured: [ KEY_CODE_SHIFT ], keyCode: KEY_CODE_CTRL }, expected: false },
		{ name: "should return false when there are no actions", input: { configured: [], keyCode: KEY_CODE_CTRL }, expected: false }
	]
} as const satisfies Record<string, readonly TestCase[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

/**
 * Replaces `window.settings` with actions that use the given trigger keys.
 *
 * @param {readonly (number | string)[]} keys - Trigger keys of the configured actions.
 */
function configureKeys(keys: readonly (number | string)[]): void {
	window.settings = Object.fromEntries(keys.map((key, i) => [ String(101 + i), { key } ])) as IntentionalAnyForValidation;
}

describe("keyState", () => {
	beforeEach(() => {
		// Arrange: No key held, no selection, no configured actions
		vi.clearAllMocks();
		window.key_pressed = 0;
		window.stop_menu = false;
		window.scroll_bug_ignore = false;
		window.box_on = false;
		configureKeys([]);
	});

	describe("keydown", () => {
		TestRunner.success(testData.keydownCases, undefined, ({ event, os, configuredKeys }: KeyInput) => {
			window.os = os;
			configureKeys(configuredKeys ?? []);

			keydown(event as KeyboardEvent);

			return { keyPressed: window.key_pressed, stopMenu: window.stop_menu, scrollBugIgnore: window.scroll_bug_ignore };
		});
	});

	describe("keyup", () => {
		TestRunner.success(testData.keyupCases, undefined, ({ event, os }: KeyInput) => {
			window.os = os;
			window.key_pressed = KEY_CODE_SHIFT;
			window.stop_menu = os === OS_LINUX;

			keyup(event as KeyboardEvent);

			return { keyPressed: window.key_pressed, stopMenu: window.stop_menu };
		});
	});

	describe("blur", () => {
		TestRunner.success(testData.blurCases, undefined, ({ trusted, onWindow, boxOn }: BlurInput) => {
			window.os = OS_WIN;
			window.key_pressed = KEY_CODE_SHIFT;
			window.box_on = boxOn;

			blur({ isTrusted: trusted, target: onWindow ? window : document.body } as unknown as FocusEvent);

			return { keyPressed: window.key_pressed, stopCalls: vi.mocked(stop).mock.calls.length };
		});
	});

	describe("allowKey", () => {
		TestRunner.success(testData.allowKeyCases, undefined, ({ configured, keyCode }: { configured: readonly (number | string)[], keyCode: number }) => {
			configureKeys(configured);

			return allowKey(keyCode);
		}, { matcher: "toBe" });
	});

	describe("removeKey", () => {
		TestRunner.success([ { name: "should reset the key and re-enable the Linux context menu", input: undefined, expected: { keyPressed: 0, stopMenu: false } } ], undefined, () => {
			window.os = OS_LINUX;
			window.key_pressed = KEY_CODE_CTRL;
			window.stop_menu = true;

			removeKey();

			return { keyPressed: window.key_pressed, stopMenu: window.stop_menu };
		});
	});
});

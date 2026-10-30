/**
 * options displayKeys Tests
 *
 * Verifies which modifier keys are offered per OS and mouse button in the options page key selector.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 */

import { describe, beforeEach } from "vitest";
import { displayKeys } from "@/entrypoints/options/options";
import { OS_LINUX, OS_MAC, OS_WIN } from "@/assets/js/constants/os";
import { KEY_CODE_ALT, KEY_CODE_CTRL, KEY_CODE_META, KEY_CODE_NONE, KEY_CODE_SHIFT } from "@/assets/js/constants/keyboard";
import { MOUSE_BUTTON_LEFT, MOUSE_BUTTON_RIGHT } from "@/assets/js/constants/mouseButton";
import type { OsType } from "@/assets/js/types/OS";
import { TestRunner, type TestCase } from "../../shared/support/TestRunner";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface Input {
	readonly mouseButton: number;
	readonly os: OsType;
	/** Key code whose label is returned. */
	readonly keyCode: number;
}

const testData = {
	keyLabelCases: [
		// Windows: Alt is available, Cmd is not
		{ name: "should include Shift on Windows", input: { mouseButton: MOUSE_BUTTON_LEFT, os: OS_WIN, keyCode: KEY_CODE_SHIFT }, expected: "shift" },
		{ name: "should include Ctrl on Windows", input: { mouseButton: MOUSE_BUTTON_LEFT, os: OS_WIN, keyCode: KEY_CODE_CTRL }, expected: "ctrl" },
		{ name: "should include Alt on Windows", input: { mouseButton: MOUSE_BUTTON_LEFT, os: OS_WIN, keyCode: KEY_CODE_ALT }, expected: "alt" },
		{ name: "should not include Cmd on Windows", input: { mouseButton: MOUSE_BUTTON_LEFT, os: OS_WIN, keyCode: KEY_CODE_META }, expected: undefined },
		// Linux: neither Alt nor Cmd is available
		{ name: "should not include Alt on Linux", input: { mouseButton: MOUSE_BUTTON_LEFT, os: OS_LINUX, keyCode: KEY_CODE_ALT }, expected: undefined },
		{ name: "should not include Cmd on Linux", input: { mouseButton: MOUSE_BUTTON_LEFT, os: OS_LINUX, keyCode: KEY_CODE_META }, expected: undefined },
		{ name: "should include Shift on Linux", input: { mouseButton: MOUSE_BUTTON_LEFT, os: OS_LINUX, keyCode: KEY_CODE_SHIFT }, expected: "shift" },
		{ name: "should include Ctrl on Linux", input: { mouseButton: MOUSE_BUTTON_LEFT, os: OS_LINUX, keyCode: KEY_CODE_CTRL }, expected: "ctrl" },
		// Mac: both Alt and Cmd are available
		{ name: "should include Alt on Mac", input: { mouseButton: MOUSE_BUTTON_LEFT, os: OS_MAC, keyCode: KEY_CODE_ALT }, expected: "alt" },
		{ name: "should include Cmd on Mac", input: { mouseButton: MOUSE_BUTTON_LEFT, os: OS_MAC, keyCode: KEY_CODE_META }, expected: "cmd" }
	],
	allowNoKeyCases: [
		{ name: "should allow no key (KEY_CODE_NONE) for left click on Linux", input: { mouseButton: MOUSE_BUTTON_LEFT, os: OS_LINUX, keyCode: KEY_CODE_NONE }, expected: "" },
		{ name: "should not allow no key (KEY_CODE_NONE) for right click on Linux", input: { mouseButton: MOUSE_BUTTON_RIGHT, os: OS_LINUX, keyCode: KEY_CODE_NONE }, expected: undefined },
		{ name: "should allow no key (KEY_CODE_NONE) for right click on Windows", input: { mouseButton: MOUSE_BUTTON_RIGHT, os: OS_WIN, keyCode: KEY_CODE_NONE }, expected: "" }
	]
} as const satisfies Record<string, readonly TestCase<Input>[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

describe("options displayKeys (legacy test rewrite)", () => {
	beforeEach(() => {
		// Arrange: Minimal DOM expected by displayKeys
		document.body.innerHTML = "<select id=\"form_key\"></select>";
	});

	describe("Modifier keys per OS", () => {
		TestRunner.success(testData.keyLabelCases, undefined, ({ mouseButton, os, keyCode }: Input) => displayKeys(mouseButton, os)[keyCode], { matcher: "toBe" });
	});

	describe("Allow-no-key by mouse button and OS", () => {
		TestRunner.success(testData.allowNoKeyCases, undefined, ({ mouseButton, os, keyCode }: Input) => displayKeys(mouseButton, os)[keyCode], { matcher: "toBe" });
	});
});

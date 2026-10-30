/**
 * detectOs Tests
 *
 * Verifies OS detection from `navigator.platform` and the priority of `navigator.userAgentData.platform`.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 */

import { describe, afterEach, beforeEach } from "vitest";
import { detectOs } from "@/assets/js/lib/detectOs";
import { OS_LINUX, OS_MAC, OS_WIN } from "@/assets/js/constants/os";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface Input {
	/** Value stubbed for `navigator.platform`. */
	readonly platform: string;
	/** Value stubbed for `navigator.userAgentData.platform`. When omitted, `userAgentData` stays undefined. */
	readonly userAgentDataPlatform?: string;
}

const testData = {
	successCases: [
		{ name: "should detect OS_WIN for Windows platforms", input: { platform: "Win32" }, expected: OS_WIN },
		{ name: "should detect OS_MAC for Mac / iOS platforms", input: { platform: "MacIntel" }, expected: OS_MAC },
		{ name: "should detect OS_LINUX for Linux / Android or other platforms", input: { platform: "Linux x86_64" }, expected: OS_LINUX },
		{
			name: "should prioritize navigator.userAgentData.platform when available",
			input: { platform: "Linux", userAgentDataPlatform: "Windows" },
			expected: OS_WIN
		}
	]
} as const satisfies Record<string, readonly TestCase<Input>[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

/**
 * Overrides a navigator property for the current test.
 *
 * @param {string} key - Navigator property name.
 * @param {unknown} value - Value to define.
 */
function stubNavigator(key: string, value: unknown): void {
	Object.defineProperty(navigator, key, { configurable: true, value });
}

describe("detectOs", () => {
	beforeEach(() => {
		// Arrange: Start every test without userAgentData
		stubNavigator("userAgentData", undefined);
	});

	afterEach(() => {
		// Cleanup: Remove own-property overrides so the JSDOM defaults are visible again
		Reflect.deleteProperty(navigator, "platform");
		Reflect.deleteProperty(navigator, "userAgentData");
	});

	describe("Success cases", () => {
		TestRunner.success(testData.successCases, undefined, ({ platform, userAgentDataPlatform }: Input) => {
			stubNavigator("platform", platform);
			if (userAgentDataPlatform !== undefined) {
				stubNavigator("userAgentData", { platform: userAgentDataPlatform });
			}

			return detectOs();
		}, { matcher: "toBe" });
	});
});

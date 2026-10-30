/**
 * detectBrowser Tests
 *
 * Verifies browser detection from the manifest, `navigator.userAgentData`, and the `navigator.userAgent` fallback.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link project/tests/shared/types/validation.ts} - Standard type for validation tests
 */

import { describe, afterEach, beforeEach, vi } from "vitest";
import { browser } from "wxt/browser";
import { detectBrowser } from "@/assets/js/lib/detectBrowser";
import { BROWSER_CHROME, BROWSER_FIREFOX, BROWSER_OTHER } from "@/assets/js/constants/browser";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface Input {
	/** Partial manifest returned by the mocked `browser.runtime.getManifest`. */
	readonly manifest: IntentionalAnyForValidation;
	/** Value stubbed for `navigator.userAgentData`. */
	readonly userAgentData?: unknown;
	/** Value stubbed for `navigator.userAgent`. When omitted, the JSDOM default is used. */
	readonly userAgent?: string;
}

const testData = {
	successCases: [
		{
			name: "should detect Firefox when browser_specific_settings exists in manifest",
			input: {
				manifest: {
					manifest_version: 3,
					name: "Test",
					version: "1.0.0",
					browser_specific_settings: { gecko: { id: "test@example.com" } }
				}
			},
			expected: BROWSER_FIREFOX
		},
		{
			name: "should detect Chrome via navigator.userAgentData when manifest lacks browser_specific_settings",
			input: {
				manifest: { name: "Test", version: "1.0.0" },
				userAgentData: { brands: [ { brand: "Google Chrome", version: "125" } ] }
			},
			expected: BROWSER_CHROME
		},
		{
			name: "should detect Firefox via navigator.userAgent string fallback",
			input: {
				manifest: {},
				userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0"
			},
			expected: BROWSER_FIREFOX
		},
		{
			name: "should detect Chrome via navigator.userAgent string fallback",
			input: {
				manifest: {},
				userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36"
			},
			expected: BROWSER_CHROME
		},
		{
			name: "should return BROWSER_OTHER when unknown browser",
			input: { manifest: {}, userAgent: "CustomBrowser/1.0" },
			expected: BROWSER_OTHER
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

describe("detectBrowser", () => {
	beforeEach(() => {
		// Arrange: Start every test without userAgentData
		vi.restoreAllMocks();
		stubNavigator("userAgentData", undefined);
	});

	afterEach(() => {
		// Cleanup: Remove own-property overrides so the JSDOM defaults are visible again
		Reflect.deleteProperty(navigator, "userAgent");
		Reflect.deleteProperty(navigator, "userAgentData");
	});

	describe("Success cases", () => {
		TestRunner.success(testData.successCases, undefined, ({ manifest, userAgentData, userAgent }: Input) => {
			vi.spyOn(browser.runtime, "getManifest").mockReturnValue(manifest);
			if (userAgentData !== undefined) {
				stubNavigator("userAgentData", userAgentData);
			}
			if (userAgent !== undefined) {
				stubNavigator("userAgent", userAgent);
			}

			return detectBrowser();
		}, { matcher: "toBe" });
	});
});

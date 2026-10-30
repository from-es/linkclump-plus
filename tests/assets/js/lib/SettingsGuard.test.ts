/**
 * SettingsGuard Tests
 *
 * Verifies the `isSettings` type guard accepts valid Settings structures and rejects malformed values.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 */

import { describe } from "vitest";
import { isSettings } from "@/assets/js/lib/SettingsGuard";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

const testData = {
	validCases: [
		{
			name: "should return true for valid Settings structure",
			input: {
				actions: {
					101: {
						action: "tabs",
						color: "#FFA500",
						key: 90,
						mouse: 0,
						options: { smart: 0, ignore: [ 0 ], delay: 0, close: 0, block: true, reverse: false, end: false }
					}
				},
				blocked: [ "example\\.com" ]
			},
			expected: true
		},
		{ name: "should return true for empty actions and blocked array", input: { actions: {}, blocked: [] }, expected: true }
	],
	invalidCases: [
		{ name: "should return false for null", input: null, expected: false },
		{ name: "should return false for undefined", input: undefined, expected: false },
		{ name: "should return false for string primitive", input: "string", expected: false },
		{ name: "should return false for number primitive", input: 123, expected: false },
		{ name: "should return false for boolean primitive", input: true, expected: false },
		{ name: "should return false if actions property is missing", input: { blocked: [] }, expected: false },
		{ name: "should return false if actions property is null", input: { actions: null, blocked: [] }, expected: false },
		{ name: "should return false if actions property is not an object", input: { actions: "invalid", blocked: [] }, expected: false },
		{ name: "should return false if blocked property is missing", input: { actions: {} }, expected: false },
		{ name: "should return false if blocked property is null", input: { actions: {}, blocked: null }, expected: false },
		{ name: "should return false if blocked property is a plain object", input: { actions: {}, blocked: {} }, expected: false },
		{ name: "should return false if blocked property is a string", input: { actions: {}, blocked: "not-an-array" }, expected: false }
	]
} as const satisfies Record<string, readonly TestCase<unknown, boolean>[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

describe("SettingsGuard isSettings", () => {
	describe("Valid structures", () => {
		TestRunner.success(testData.validCases, undefined, (input) => isSettings(input), { matcher: "toBe" });
	});

	describe("Invalid structures", () => {
		TestRunner.success(testData.invalidCases, undefined, (input) => isSettings(input), { matcher: "toBe" });
	});
});

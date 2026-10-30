/**
 * regexp Tests
 *
 * Verifies RegExp creation, error message extraction, and invalid pattern detection without throwing.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 */

import { describe } from "vitest";
import { createRegExp, findInvalidPattern, getRegExpError } from "@/assets/js/lib/regexp";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface CreateInput {
	readonly pattern: string;
	readonly flags?: string;
}

interface MatchInput {
	readonly pattern: string;
	readonly url: string;
}

const testData = {
	createFlags: [
		{ name: "should apply default 'i' flag", input: { pattern: "example\\.com" }, expected: "i" },
		{ name: "should support custom flags", input: { pattern: "abc", flags: "g" }, expected: "g" }
	],
	createInstance: [
		{ name: "should create a RegExp object from a valid pattern", input: { pattern: "example\\.com" }, expected: true }
	],
	createMatching: [
		{ name: "should match a URL containing the pattern", input: { pattern: "example\\.com", url: "https://example.com/test" }, expected: true },
		{ name: "should not match a URL without the pattern", input: { pattern: "example\\.com", url: "https://other.org" }, expected: false }
	],
	createInvalid: [
		{ name: "should safely return null for invalid pattern (*.example.com) without throwing", input: { pattern: "*.example.com" }, expected: null },
		{ name: "should safely return null for syntax errors such as unclosed parenthesis", input: { pattern: "(unclosed-group" }, expected: null }
	],
	errorMessageNull: [
		{ name: "should return null for valid regular expressions", input: "^https://", expected: null }
	],
	errorMessageString: [
		{ name: "should return a non-empty error message for invalid regular expressions", input: "*.example.com", expected: true }
	],
	findInvalidNull: [
		{ name: "should return null when all patterns are valid", input: [ "google\\.com", "yahoo\\.co\\.jp", "github\\.com/.*" ], expected: null },
		{ name: "should skip empty strings and whitespace-only entries", input: [ "", "  ", "\t\n", "valid\\.org" ], expected: null }
	],
	findInvalidFirst: [
		{
			name: "should return the first invalid pattern and its error message",
			input: [ "valid\\.org", "[invalid[pattern", "*.bad.com" ],
			expected: { pattern: "[invalid[pattern", hasMessage: true }
		}
	]
} as const satisfies Record<string, readonly TestCase[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

describe("regexp utilities (H5 migration)", () => {
	describe("createRegExp", () => {
		describe("Flags", () => {
			TestRunner.success(testData.createFlags, undefined, ({ pattern, flags }: CreateInput) => createRegExp(pattern, flags)?.flags, { matcher: "toBe" });
		});

		describe("Instance", () => {
			TestRunner.success(testData.createInstance, undefined, ({ pattern }: CreateInput) => createRegExp(pattern) instanceof RegExp, { matcher: "toBe" });
		});

		describe("Matching", () => {
			TestRunner.success(testData.createMatching, undefined, ({ pattern, url }: MatchInput) => createRegExp(pattern)?.test(url), { matcher: "toBe" });
		});

		describe("Invalid patterns", () => {
			TestRunner.success(testData.createInvalid, undefined, ({ pattern }: CreateInput) => createRegExp(pattern), { matcher: "toBe" });
		});
	});

	describe("getRegExpError", () => {
		describe("Valid patterns", () => {
			TestRunner.success(testData.errorMessageNull, undefined, (source: string) => getRegExpError(source), { matcher: "toBe" });
		});

		describe("Invalid patterns", () => {
			TestRunner.success(testData.errorMessageString, undefined, (source: string) => {
				const error = getRegExpError(source);
				return typeof error === "string" && error.length > 0;
			}, { matcher: "toBe" });
		});
	});

	describe("findInvalidPattern", () => {
		describe("No invalid pattern", () => {
			TestRunner.success(testData.findInvalidNull, undefined, (patterns: readonly string[]) => findInvalidPattern(patterns), { matcher: "toBe" });
		});

		describe("Invalid pattern found", () => {
			TestRunner.success(testData.findInvalidFirst, undefined, (patterns: readonly string[]) => {
				const result = findInvalidPattern(patterns);
				return { pattern: result?.pattern, hasMessage: (result?.message.length ?? 0) > 0 };
			});
		});
	});
});

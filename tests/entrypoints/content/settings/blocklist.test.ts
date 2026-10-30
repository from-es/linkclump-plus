/**
 * isBlockedUrl Tests
 *
 * Verifies blocklist matching, invalid pattern skipping (with a warning), empty pattern handling, and invalid argument handling.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link project/tests/shared/types/validation.ts} - Standard type for validation tests
 */

import { describe, afterEach, beforeEach, expect, vi } from "vitest";
import { isBlockedUrl } from "@/entrypoints/content/settings/blocklist";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface Input {
	readonly patterns: readonly string[];
	readonly url: string;
}

const testData = {
	matchCases: [
		{ name: "should return true when URL matches the first entry in blocklist", input: { patterns: [ "blocked-site\\.com", "news\\.example\\.org" ], url: "https://blocked-site.com/subpath" }, expected: true },
		{ name: "should return true when URL matches a later entry in blocklist", input: { patterns: [ "blocked-site\\.com", "news\\.example\\.org" ], url: "https://news.example.org/article" }, expected: true },
		{ name: "should return false when URL does not match any entry", input: { patterns: [ "blocked-site\\.com" ], url: "https://safe-site.com/home" }, expected: false }
	],
	invalidPatternCases: [
		{
			name: "should skip invalid patterns and still match a remaining valid pattern",
			input: { patterns: [ "*.invalid-glob.com", "(unclosed-group", "valid-blocked\\.com" ], url: "https://valid-blocked.com/page" },
			expected: true
		},
		{
			name: "should skip invalid patterns and return false when no valid pattern matches",
			input: { patterns: [ "*.invalid-glob.com", "(unclosed-group", "valid-blocked\\.com" ], url: "https://safe-site.com/page" },
			expected: false
		}
	],
	emptyPatternCases: [
		{ name: "should safely ignore empty or whitespace-only patterns and match the valid one", input: { patterns: [ "", "   ", "\t\n", "target\\.com" ], url: "https://target.com" }, expected: true },
		{ name: "should safely ignore empty or whitespace-only patterns and return false for other URLs", input: { patterns: [ "", "   ", "\t\n", "target\\.com" ], url: "https://other.com" }, expected: false }
	],
	invalidArgumentCases: [
		{ name: "should return false if patterns is null", input: { patterns: null as IntentionalAnyForValidation, url: "https://example.com" }, expected: false },
		{ name: "should return false if url is empty", input: { patterns: [ "example\\.com" ], url: "" }, expected: false },
		{ name: "should return false if patterns is empty", input: { patterns: [], url: "https://example.com" }, expected: false }
	]
} as const satisfies Record<string, readonly TestCase<Input, boolean>[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

describe("isBlockedUrl (H4 migration)", () => {
	beforeEach(() => {
		// Arrange: Silence expected console output from the target
		vi.spyOn(console, "info").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Matching", () => {
		TestRunner.success(testData.matchCases, undefined, ({ patterns, url }: Input) => isBlockedUrl(patterns, url), { matcher: "toBe" });
	});

	describe("Invalid patterns", () => {
		TestRunner.success(testData.invalidPatternCases, undefined, ({ patterns, url }: Input) => {
			const result = isBlockedUrl(patterns, url);

			// Invalid patterns must be reported with a warning, not thrown.
			expect(console.warn).toHaveBeenCalled();

			return result;
		}, { matcher: "toBe" });
	});

	describe("Empty patterns", () => {
		TestRunner.success(testData.emptyPatternCases, undefined, ({ patterns, url }: Input) => isBlockedUrl(patterns, url), { matcher: "toBe" });
	});

	describe("Invalid arguments", () => {
		TestRunner.success(testData.invalidArgumentCases, undefined, ({ patterns, url }: Input) => isBlockedUrl(patterns, url), { matcher: "toBe" });
	});
});

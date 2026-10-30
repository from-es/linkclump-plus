/**
 * uniqueUrl Tests
 *
 * Verifies that duplicate URLs are removed while the first occurrence and the original order are preserved.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 */

import { describe } from "vitest";
import { uniqueUrl } from "@/entrypoints/background/utils/uniqueUrl";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface Link {
	readonly url: string;
	readonly title: string;
}

const testData = {
	successCases: [
		{ name: "should return an empty array for empty input", input: [], expected: [] },
		{ name: "should keep all items when every URL is unique", input: [ { url: "a", title: "A" }, { url: "b", title: "B" } ], expected: [ { url: "a", title: "A" }, { url: "b", title: "B" } ] },
		{
			name: "should keep only the first occurrence of a duplicated URL (even with a different title)",
			input: [ { url: "a", title: "first" }, { url: "b", title: "B" }, { url: "a", title: "second" } ],
			expected: [ { url: "a", title: "first" }, { url: "b", title: "B" } ]
		},
		{ name: "should treat URLs case-sensitively", input: [ { url: "a", title: "1" }, { url: "A", title: "2" } ], expected: [ { url: "a", title: "1" }, { url: "A", title: "2" } ] }
	]
} as const satisfies Record<string, readonly TestCase<readonly Link[], readonly Link[]>[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

describe("uniqueUrl", () => {
	describe("Success cases", () => {
		TestRunner.success(testData.successCases, undefined, (links) => uniqueUrl([ ...links ]));
	});
});

/**
 * escapeHTML Tests
 *
 * Verifies HTML special character escaping for XSS prevention and TypeError handling for non-string arguments.
 *
 * @file
 * @see {@link vitest.config.ts} - Global settings
 * @see {@link tests/shared/support/setup.ts} - Shared mocks
 * @see {@link tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link tests/shared/types/validation.ts} - Standard type for validation tests
 */

import { describe, afterEach, it, expect, vi } from "vitest";
import { escapeHTML } from "@/assets/js/lib/escapeHTML";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

const testData = {
	singleCharCases: [
		{ name: "should convert '<' to '&lt;'", input: "<", expected: "&lt;" },
		{ name: "should convert '>' to '&gt;'", input: ">", expected: "&gt;" },
		{ name: "should convert '&' to '&amp;'", input: "&", expected: "&amp;" },
		{ name: "should convert '\"' to '&quot;'", input: "\"", expected: "&quot;" },
		{ name: "should convert \"'\" to '&#x27;'", input: "'", expected: "&#x27;" },
		{ name: "should convert '`' to '&#x60;'", input: "`", expected: "&#x60;" }
	],
	boundaryCases: [
		{ name: "should handle empty string", input: "", expected: "" },
		{ name: "should return the same string if it contains no special characters", input: "normal plain text 12345", expected: "normal plain text 12345" },
		{ name: "should preserve leading and trailing whitespace", input: "   surrounded by spaces   ", expected: "   surrounded by spaces   " },
		{ name: "should preserve tabs and newlines", input: "Line 1\n\tLine 2\r\nLine 3", expected: "Line 1\n\tLine 2\r\nLine 3" },
		{ name: "should correctly escape multiple consecutive special characters", input: "<<>>&&\"\"''``", expected: "&lt;&lt;&gt;&gt;&amp;&amp;&quot;&quot;&#x27;&#x27;&#x60;&#x60;" },
		{ name: "should correctly escape special characters at the boundaries", input: "&start and end>", expected: "&amp;start and end&gt;" }
	],
	xssAttackCases: [
		{
			name: "should neutralize script tags in mixed strings",
			input: "<script>alert('XSS & `test` & \"quotes\"');</script>",
			expected: "&lt;script&gt;alert(&#x27;XSS &amp; &#x60;test&#x60; &amp; &quot;quotes&quot;&#x27;);&lt;/script&gt;"
		},
		{
			name: "should neutralize double-quote HTML attribute breakout",
			input: "value\" onfocus=\"alert(1)",
			expected: "value&quot; onfocus=&quot;alert(1)"
		},
		{
			name: "should neutralize single-quote HTML attribute breakout",
			input: "value' onfocus='alert(1)",
			expected: "value&#x27; onfocus=&#x27;alert(1)"
		},
		{
			name: "should neutralize template literal backtick execution",
			input: "${alert`1`}",
			expected: "${alert&#x60;1&#x60;}"
		},
		{
			name: "should neutralize img tag onerror payloads",
			input: "<img src=\"x\" onerror=\"alert('XSS')\" />",
			expected: "&lt;img src=&quot;x&quot; onerror=&quot;alert(&#x27;XSS&#x27;)&quot; /&gt;"
		},
		{
			name: "should properly escape pre-existing HTML entities without unescaping",
			input: "&amp; &lt; &gt; &quot; &#x27; &#x60;",
			expected: "&amp;amp; &amp;lt; &amp;gt; &amp;quot; &amp;#x27; &amp;#x60;"
		}
	],
	multibyteCases: [
		{
			name: "should preserve Japanese text and escape special characters",
			input: "日本語タイトル & <検索キーワード> '引用' `コード`",
			expected: "日本語タイトル &amp; &lt;検索キーワード&gt; &#x27;引用&#x27; &#x60;コード&#x60;"
		},
		{
			name: "should preserve emojis and unicode symbols",
			input: "🚀 Link & Star ⭐ <tag>",
			expected: "🚀 Link &amp; Star ⭐ &lt;tag&gt;"
		}
	],
	urlCases: [
		{
			name: "should correctly escape URL query parameters with special characters",
			input: "https://example.com/page?id='1'&name=\"test\"&tag=`wip`&a=1&b=2",
			expected: "https://example.com/page?id=&#x27;1&#x27;&amp;name=&quot;test&quot;&amp;tag=&#x60;wip&#x60;&amp;a=1&amp;b=2"
		}
	],
	errorCases: [
		{ name: "should throw TypeError for number (integer)", input: 123 as IntentionalAnyForValidation, expected: TypeError },
		{ name: "should throw TypeError for number (float)", input: 3.14 as IntentionalAnyForValidation, expected: TypeError },
		{ name: "should throw TypeError for number (NaN)", input: NaN as IntentionalAnyForValidation, expected: TypeError },
		{ name: "should throw TypeError for number (Infinity)", input: Infinity as IntentionalAnyForValidation, expected: TypeError },
		{ name: "should throw TypeError for boolean true", input: true as IntentionalAnyForValidation, expected: TypeError },
		{ name: "should throw TypeError for boolean false", input: false as IntentionalAnyForValidation, expected: TypeError },
		{ name: "should throw TypeError for null", input: null as IntentionalAnyForValidation, expected: TypeError },
		{ name: "should throw TypeError for undefined", input: undefined as IntentionalAnyForValidation, expected: TypeError },
		{ name: "should throw TypeError for object", input: { text: "hello" } as IntentionalAnyForValidation, expected: TypeError },
		{ name: "should throw TypeError for array", input: [ "item" ] as IntentionalAnyForValidation, expected: TypeError },
		{ name: "should throw TypeError for symbol", input: Symbol("sym") as IntentionalAnyForValidation, expected: TypeError },
		{ name: "should throw TypeError for bigint", input: 123n as IntentionalAnyForValidation, expected: TypeError },
		{ name: "should throw TypeError for function", input: (() => {}) as IntentionalAnyForValidation, expected: TypeError }
	]
} as const satisfies Record<string, readonly TestCase[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

describe("escapeHTML", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Single character escaping", () => {
		TestRunner.success(testData.singleCharCases, undefined, (input: string) => escapeHTML(input), { matcher: "toBe" });
	});

	describe("Boundary and whitespace cases", () => {
		TestRunner.success(testData.boundaryCases, undefined, (input: string) => escapeHTML(input), { matcher: "toBe" });
	});

	describe("XSS attack vector neutralization", () => {
		TestRunner.success(testData.xssAttackCases, undefined, (input: string) => escapeHTML(input), { matcher: "toBe" });
	});

	describe("Multibyte and Unicode handling", () => {
		TestRunner.success(testData.multibyteCases, undefined, (input: string) => escapeHTML(input), { matcher: "toBe" });
	});

	describe("URL query string handling", () => {
		TestRunner.success(testData.urlCases, undefined, (input: string) => escapeHTML(input), { matcher: "toBe" });
	});

	describe("Error handling and non-string types", () => {
		TestRunner.error(testData.errorCases, undefined, (input: unknown) => {
			vi.spyOn(console, "error").mockImplementation(() => {});
			return escapeHTML(input);
		});

		it("should log error details to console.error when non-string is passed", () => {
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			const invalidInput = 42;

			expect(() => escapeHTML(invalidInput)).toThrow(TypeError);
			expect(consoleSpy).toHaveBeenCalledOnce();
			expect(consoleSpy).toHaveBeenCalledWith(
				"Invalid argument: 'target' must be a string:",
				{ target: invalidInput }
			);
		});
	});
});

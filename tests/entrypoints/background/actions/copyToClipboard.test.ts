/**
 * copyToClipboard formatLink Tests
 *
 * Verifies link formatting for every copy format, whitespace normalization, HTML/Markdown escaping, and invalid format handling.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link project/tests/shared/types/validation.ts} - Standard type for validation tests
 */

import { describe, beforeEach, vi } from "vitest";
import { browser } from "wxt/browser";
import { copyToClipboard, formatLink, handleCopyToClipboard } from "@/entrypoints/background/actions/copyToClipboard";
import { CopyFormatType } from "@/assets/js/constants/CopyFormat";
import type { ActivateMessage } from "@/assets/js/types/Messages";
import type { CopyFormat } from "@/assets/js/types/Settings";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface Input {
	readonly link: { readonly url: string, readonly title: string };
	readonly format: CopyFormat;
}

const STANDARD_LINK = { url: "https://example.com/page", title: "Example Title" } as const;

const testData = {
	successCases: [
		{ name: "should format URLS_WITH_TITLES (format 0)", input: { link: STANDARD_LINK, format: CopyFormatType.URLS_WITH_TITLES as CopyFormat }, expected: "Example Title\thttps://example.com/page\n" },
		{ name: "should format URLS_ONLY (format 1)", input: { link: STANDARD_LINK, format: CopyFormatType.URLS_ONLY as CopyFormat }, expected: "https://example.com/page\n" },
		{ name: "should format URLS_ONLY_SPACE_SEPARATED (format 2)", input: { link: STANDARD_LINK, format: CopyFormatType.URLS_ONLY_SPACE_SEPARATED as CopyFormat }, expected: "https://example.com/page " },
		{ name: "should format TITLES_ONLY (format 3)", input: { link: STANDARD_LINK, format: CopyFormatType.TITLES_ONLY as CopyFormat }, expected: "Example Title\n" },
		{
			name: "should format AS_LINK_HTML (format 4) and escape HTML characters in title and url",
			input: {
				link: { url: "https://example.com/page?a=1&b=\"test\"", title: "<Script> & \"Quotes\"" },
				format: CopyFormatType.AS_LINK_HTML as CopyFormat
			},
			expected: "<a href=\"https://example.com/page?a=1&amp;b=&quot;test&quot;\">&lt;Script&gt; &amp; &quot;Quotes&quot;</a>\n"
		},
		{ name: "should format AS_LIST_LINK_HTML (format 5)", input: { link: STANDARD_LINK, format: CopyFormatType.AS_LIST_LINK_HTML as CopyFormat }, expected: "<li><a href=\"https://example.com/page\">Example Title</a></li>\n" },
		{
			name: "should format AS_MARKDOWN (format 6) and escape brackets and parentheses",
			input: {
				link: { url: "https://example.com/test(1)?q=<val>", title: "Feature [WIP] (v2)" },
				format: CopyFormatType.AS_MARKDOWN as CopyFormat
			},
			expected: "[Feature \\[WIP\\] (v2)](https://example.com/test%281%29?q=%3Cval%3E)\n"
		},
		{
			name: "should collapse multiple whitespace, tabs, and newlines in titles",
			input: {
				link: { url: "https://example.com", title: "  Line 1\n\t  Line 2   " },
				format: CopyFormatType.TITLES_ONLY as CopyFormat
			},
			expected: "Line 1 Line 2\n"
		}
	],
	errorCases: [
		{ name: "should throw an error on invalid copy format", input: { link: STANDARD_LINK, format: 999 as IntentionalAnyForValidation }, expected: "Invalid copy format: 999" }
	]
} as const satisfies Record<string, readonly TestCase<Input>[]>;

interface CopyInput {
	readonly urls: readonly { readonly url: string, readonly title: string }[];
	readonly copy: CopyFormat;
}

interface SendInput {
	readonly sender: { readonly tab?: { readonly id?: number }, readonly frameId?: number };
}

const clipboardData = {
	handleCases: [
		{
			name: "should concatenate the formatted links",
			input: { urls: [ { url: "https://a.example", title: "A" }, { url: "https://b.example", title: "B" } ], copy: CopyFormatType.URLS_ONLY as CopyFormat },
			expected: "https://a.example\nhttps://b.example\n"
		},
		{
			name: "should wrap the links in <ul> for AS_LIST_LINK_HTML",
			input: { urls: [ { url: "https://a.example", title: "A" } ], copy: CopyFormatType.AS_LIST_LINK_HTML as CopyFormat },
			expected: "<ul>\n<li><a href=\"https://a.example\">A</a></li>\n</ul>\n"
		},
		{
			name: "should wrap the links in <ul> when the format is stored as a numeric string",
			input: { urls: [ { url: "https://a.example", title: "A" } ], copy: String(CopyFormatType.AS_LIST_LINK_HTML) as unknown as CopyFormat },
			expected: "<ul>\n<li><a href=\"https://a.example\">A</a></li>\n</ul>\n"
		}
	],
	sendCases: [
		{
			name: "should send the text to the sender tab and frame",
			input: { sender: { tab: { id: 5 }, frameId: 2 } },
			expected: [ [ 5, { message: "copyToClipboard", text: "TEXT" }, { frameId: 2 } ] ]
		},
		{
			name: "should send nothing when the sender has no tab",
			input: { sender: {} },
			expected: []
		},
		{
			name: "should send nothing when the sender tab has no id",
			input: { sender: { tab: {} } },
			expected: []
		}
	]
} as const satisfies Record<string, readonly TestCase[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

describe("copyToClipboard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(browser.tabs.sendMessage).mockResolvedValue(undefined as never);
	});

	describe("copyToClipboard", () => {
		TestRunner.success(clipboardData.sendCases, undefined, async ({ sender }: SendInput) => {
			await copyToClipboard("TEXT", sender as IntentionalAnyForValidation);

			return vi.mocked(browser.tabs.sendMessage).mock.calls;
		});
	});

	describe("handleCopyToClipboard", () => {
		TestRunner.success(clipboardData.handleCases, undefined, async ({ urls, copy }: CopyInput) => {
			await handleCopyToClipboard(
				{ message: "activate", urls, setting: { action: "copy", options: { copy } } } as IntentionalAnyForValidation as ActivateMessage<never>,
				{ tab: { id: 1 }, frameId: 0 } as IntentionalAnyForValidation
			);

			return (vi.mocked(browser.tabs.sendMessage).mock.calls[0]?.[1] as { text: string } | undefined)?.text;
		}, { matcher: "toBe" });
	});
});

describe("copyToClipboard formatLink (H3 migration)", () => {
	describe("Success cases", () => {
		TestRunner.success(testData.successCases, undefined, ({ link, format }: Input) => formatLink(link, format), { matcher: "toBe" });
	});

	describe("Error handling", () => {
		TestRunner.error(testData.errorCases, undefined, ({ link, format }: Input) => formatLink(link, format));
	});
});

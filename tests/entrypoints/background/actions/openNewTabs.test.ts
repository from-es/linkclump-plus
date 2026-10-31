/**
 * handleOpenNewTabs Tests
 *
 * Verifies opening links as tabs next to (or at the end of) the sender tab, and the guard for missing sender tabs.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link project/tests/shared/types/validation.ts} - Standard type for validation tests
 */

import { describe, beforeEach, vi } from "vitest";
import { browser } from "wxt/browser";
import { handleOpenNewTabs } from "@/entrypoints/background/actions/openNewTabs";
import type { ActivateMessage } from "@/assets/js/types/Messages";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface Input {
	readonly options: { readonly end?: boolean };
	readonly sender: { readonly tab?: { readonly id?: number } };
}

const testData = {
	successCases: [
		{
			name: "should open tabs right after the sender tab by default",
			input: { options: { end: false }, sender: { tab: { id: 10 } } },
			expected: [ { windowId: 7, url: "https://a.example", active: false, openerTabId: 10, index: 4 } ]
		},
		{
			name: "should open tabs at the end of the tab strip when the end option is set",
			input: { options: { end: true }, sender: { tab: { id: 10 } } },
			expected: [ { windowId: 7, url: "https://a.example", active: false, openerTabId: 10 } ]
		},
		{
			name: "should do nothing when the sender has no tab",
			input: { options: {}, sender: {} },
			expected: []
		},
		{
			name: "should do nothing when the sender tab has no id",
			input: { options: {}, sender: { tab: {} } },
			expected: []
		}
	]
} as const satisfies Record<string, readonly TestCase<Input>[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

describe("handleOpenNewTabs", () => {
	beforeEach(() => {
		// Arrange: The sender tab is #10 at index 3 in window #7
		vi.clearAllMocks();
		vi.mocked(browser.tabs.get).mockResolvedValue({ id: 10, index: 3, windowId: 7 } as never);
		vi.mocked(browser.tabs.create).mockResolvedValue({ id: 100 } as never);
	});

	describe("Success cases", () => {
		TestRunner.success(testData.successCases, undefined, async ({ options, sender }: Input) => {
			const request = {
				message: "activate",
				urls: [ { url: "https://a.example", title: "A" } ],
				setting: { action: "tabs", options }
			} as IntentionalAnyForValidation as ActivateMessage<never>;

			await handleOpenNewTabs(request, sender as IntentionalAnyForValidation);

			return vi.mocked(browser.tabs.create).mock.calls.map(([ properties ]) => properties);
		});
	});
});

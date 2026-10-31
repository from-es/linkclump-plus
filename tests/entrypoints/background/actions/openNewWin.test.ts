/**
 * handleOpenNewWin Tests
 *
 * Verifies opening links in a new window: first link opens the window, the rest become tabs,
 * and focus is returned to the original window when requested.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link project/tests/shared/types/validation.ts} - Standard type for validation tests
 */

import { describe, beforeEach, vi } from "vitest";
import { browser } from "wxt/browser";
import { handleOpenNewWin } from "@/entrypoints/background/actions/openNewWin";
import type { ActivateMessage } from "@/assets/js/types/Messages";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface Input {
	readonly urls: readonly string[];
	readonly options: { readonly unfocus?: boolean };
}

const testData = {
	successCases: [
		{
			name: "should open a focused window for a single link",
			input: { urls: [ "https://a.example" ], options: {} },
			expected: { windows: [ { url: "https://a.example", focused: true } ], tabs: [], updates: [] }
		},
		{
			name: "should open the remaining links as tabs in the new window",
			input: { urls: [ "https://a.example", "https://b.example" ], options: {} },
			expected: {
				windows: [ { url: "https://a.example", focused: true } ],
				tabs: [ { windowId: 2, url: "https://b.example", active: false, openerTabId: undefined } ],
				updates: []
			}
		},
		{
			name: "should open an unfocused window and refocus the original window when unfocus is set",
			input: { urls: [ "https://a.example" ], options: { unfocus: true } },
			expected: { windows: [ { url: "https://a.example", focused: false } ], tabs: [], updates: [ [ 1, { focused: true } ] ] }
		},
		{
			name: "should do nothing when there are no links",
			input: { urls: [], options: {} },
			expected: { windows: [], tabs: [], updates: [] }
		}
	]
} as const satisfies Record<string, readonly TestCase<Input>[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

describe("handleOpenNewWin", () => {
	beforeEach(() => {
		// Arrange: Sender window #1; the newly created window is #2
		vi.clearAllMocks();
		vi.mocked(browser.windows.create).mockResolvedValue({ id: 2 } as never);
		vi.mocked(browser.windows.update).mockResolvedValue({} as never);
		vi.mocked(browser.tabs.create).mockResolvedValue({ id: 100 } as never);
	});

	describe("Success cases", () => {
		TestRunner.success(testData.successCases, undefined, async ({ urls, options }: Input) => {
			const request = {
				message: "activate",
				urls: urls.map((url) => ({ url, title: url })),
				setting: { action: "win", options }
			} as IntentionalAnyForValidation as ActivateMessage<never>;

			await handleOpenNewWin(request, { tab: { windowId: 1 } } as IntentionalAnyForValidation);

			return {
				windows: vi.mocked(browser.windows.create).mock.calls.map(([ properties ]) => properties),
				tabs: vi.mocked(browser.tabs.create).mock.calls.map(([ properties ]) => properties),
				updates: vi.mocked(browser.windows.update).mock.calls
			};
		});
	});
});

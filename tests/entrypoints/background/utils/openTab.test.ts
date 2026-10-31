/**
 * openTab Tests
 *
 * Verifies sequential tab creation: opener handling with/without delay, tab index progression,
 * delayed opening, and the auto-close timer.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 */

import { describe, afterEach, beforeEach, vi } from "vitest";
import { browser } from "wxt/browser";
import { openTab } from "@/entrypoints/background/utils/openTab";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface Input {
	readonly urls: readonly string[];
	readonly delay: number;
	readonly windowId?: number;
	readonly openerTabId?: number;
	readonly tabIndex?: number | null;
	readonly closeTime?: number;
	/** Fake time advanced after the call (ms). */
	readonly advanceMs: number;
}

const testData = {
	successCases: [
		{
			name: "should open a single tab with the opener when no delay is used",
			input: { urls: [ "https://a.example" ], delay: 0, windowId: 1, openerTabId: 10, advanceMs: 0 },
			expected: { created: [ { windowId: 1, url: "https://a.example", active: false, openerTabId: 10 } ], removed: [] }
		},
		{
			name: "should omit the opener when a delay is used",
			input: { urls: [ "https://a.example" ], delay: 500, windowId: 1, openerTabId: 10, advanceMs: 0 },
			expected: { created: [ { windowId: 1, url: "https://a.example", active: false } ], removed: [] }
		},
		{
			name: "should set the tab index and advance it for the following tabs",
			input: { urls: [ "https://a.example", "https://b.example" ], delay: 0, windowId: 1, openerTabId: 10, tabIndex: 5, advanceMs: 0 },
			expected: {
				created: [
					{ windowId: 1, url: "https://a.example", active: false, openerTabId: 10, index: 5 },
					{ windowId: 1, url: "https://b.example", active: false, openerTabId: 10, index: 6 }
				],
				removed: []
			}
		},
		{
			name: "should not set the index for null or invalid tab indexes",
			input: { urls: [ "https://a.example" ], delay: 0, tabIndex: -1, advanceMs: 0 },
			expected: { created: [ { windowId: undefined, url: "https://a.example", active: false, openerTabId: undefined } ], removed: [] }
		},
		{
			name: "should open remaining tabs one by one with the delay",
			input: { urls: [ "https://a.example", "https://b.example", "https://c.example" ], delay: 1000, windowId: 1, advanceMs: 1000 },
			expected: {
				created: [
					{ windowId: 1, url: "https://a.example", active: false },
					{ windowId: 1, url: "https://b.example", active: false }
				],
				removed: []
			}
		},
		{
			name: "should close the opened tab after closeTime",
			input: { urls: [ "https://a.example" ], delay: 0, windowId: 1, closeTime: 3000, advanceMs: 3000 },
			expected: { created: [ { windowId: 1, url: "https://a.example", active: false, openerTabId: undefined } ], removed: [ 100 ] }
		},
		{
			name: "should not close the opened tab before closeTime elapses",
			input: { urls: [ "https://a.example" ], delay: 0, windowId: 1, closeTime: 3000, advanceMs: 2999 },
			expected: { created: [ { windowId: 1, url: "https://a.example", active: false, openerTabId: undefined } ], removed: [] }
		},
		{
			name: "should do nothing when the list is empty",
			input: { urls: [], delay: 1000, advanceMs: 2000 },
			expected: { created: [], removed: [] }
		},
		{
			name: "should skip entries without a URL and handle the rest immediately",
			input: { urls: [ "", "https://b.example" ], delay: 1000, advanceMs: 0 },
			expected: { created: [ { windowId: undefined, url: "https://b.example", active: false } ], removed: [] }
		}
	]
} as const satisfies Record<string, readonly TestCase<Input>[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

describe("openTab", () => {
	beforeEach(() => {
		// Arrange: Fake timers and browser stubs
		vi.useFakeTimers();
		vi.clearAllMocks();
		vi.mocked(browser.tabs.create).mockResolvedValue({ id: 100 } as never);
		vi.mocked(browser.tabs.remove).mockResolvedValue(undefined as never);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("Success cases", () => {
		TestRunner.success(testData.successCases, undefined, async ({ urls, delay, windowId, openerTabId, tabIndex, closeTime, advanceMs }: Input) => {
			openTab(urls.map((url) => ({ url, title: url })), delay, windowId, openerTabId, tabIndex, closeTime);
			await vi.advanceTimersByTimeAsync(advanceMs);

			return {
				created: vi.mocked(browser.tabs.create).mock.calls.map(([ properties ]) => properties),
				removed: vi.mocked(browser.tabs.remove).mock.calls.map(([ id ]) => id)
			};
		});
	});
});

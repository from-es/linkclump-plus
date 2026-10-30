/**
 * ContentScriptManager Tests
 *
 * Verifies content script injection into existing HTTP(S) tabs and broadcasting of settings updates,
 * including the tabs that must be skipped and failures that must not propagate.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 */

import { describe, afterEach, beforeEach, vi } from "vitest";
import { browser } from "wxt/browser";
import { ContentScriptManager } from "@/entrypoints/background/scripts/ContentScriptManager";
import type { SettingsManager } from "@/entrypoints/background/settings/SettingsManager";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface WindowsInput {
	readonly windows: readonly { readonly tabs?: readonly { readonly id?: number, readonly url?: string }[] }[];
	/** Makes every tabs.sendMessage / scripting.executeScript call reject. */
	readonly rejects?: boolean;
}

const MIXED_TABS = [
	{ id: 1, url: "https://a.example/" },
	{ id: 2, url: "http://b.example/" },
	{ id: 3, url: "file:///c.html" },
	{ id: 4, url: "chrome://extensions/" },
	{ id: 5, url: "about:blank" },
	{ id: 6 },
	{ url: "https://no-id.example/" }
] as const;

const testData = {
	injectCases: [
		{ name: "should inject only into HTTP(S) tabs that have an id", input: { windows: [ { tabs: MIXED_TABS } ] }, expected: [ 1, 2 ] },
		{ name: "should skip windows without tabs", input: { windows: [ {}, { tabs: [ { id: 9, url: "https://z.example/" } ] } ] }, expected: [ 9 ] },
		{ name: "should inject across multiple windows", input: { windows: [ { tabs: [ { id: 1, url: "https://a.example/" } ] }, { tabs: [ { id: 2, url: "https://b.example/" } ] } ] }, expected: [ 1, 2 ] },
		{ name: "should not throw when injection fails and should only warn", input: { windows: [ { tabs: [ { id: 1, url: "https://a.example/" } ] } ], rejects: true }, expected: [ 1 ] }
	],
	broadcastCases: [
		{ name: "should send the current settings to HTTP(S) and file tabs only", input: { windows: [ { tabs: MIXED_TABS } ] }, expected: [ 1, 2, 3 ] },
		{ name: "should skip windows without tabs", input: { windows: [ {} ] }, expected: [] },
		{ name: "should not throw when a tab cannot receive the message", input: { windows: [ { tabs: [ { id: 1, url: "https://a.example/" } ] } ], rejects: true }, expected: [ 1 ] }
	]
} as const satisfies Record<string, readonly TestCase<WindowsInput>[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

const SETTINGS = { actions: {}, blocked: [] };

describe("ContentScriptManager", () => {
	let manager: ContentScriptManager;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "debug").mockImplementation(() => {});
		manager = new ContentScriptManager({ load: vi.fn().mockResolvedValue(SETTINGS) } as unknown as SettingsManager);
		vi.mocked(browser.scripting.executeScript).mockResolvedValue([] as never);
		vi.mocked(browser.tabs.sendMessage).mockResolvedValue(undefined as never);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("injectIntoExistingTabs", () => {
		TestRunner.success(testData.injectCases, undefined, async ({ windows, rejects }: WindowsInput) => {
			vi.mocked(browser.windows.getAll).mockResolvedValue(windows as never);
			if (rejects) {
				vi.mocked(browser.scripting.executeScript).mockRejectedValue(new Error("Cannot access"));
			}

			await manager.injectIntoExistingTabs();
			// Let the rejected promises reach their catch handlers
			await Promise.resolve();

			return vi.mocked(browser.scripting.executeScript).mock.calls.map(([ injection ]) => injection.target.tabId);
		});
	});

	describe("broadcastSettingsUpdate", () => {
		TestRunner.success(testData.broadcastCases, undefined, async ({ windows, rejects }: WindowsInput) => {
			vi.mocked(browser.windows.getAll).mockResolvedValue(windows as never);
			if (rejects) {
				vi.mocked(browser.tabs.sendMessage).mockRejectedValue(new Error("Receiving end does not exist."));
			}

			await manager.broadcastSettingsUpdate();
			await Promise.resolve();

			return vi.mocked(browser.tabs.sendMessage).mock.calls.map(([ tabId, message ]) => {
				expectUpdateMessage(message);

				return tabId;
			});
		});
	});
});

/**
 * Asserts that a broadcast message is an 'update' message carrying the current settings.
 *
 * @param {unknown} message - Message sent to a tab.
 */
function expectUpdateMessage(message: unknown): void {
	if (JSON.stringify(message) !== JSON.stringify({ message: "update", settings: SETTINGS })) {
		throw new Error(`Unexpected broadcast message: ${JSON.stringify(message)}`);
	}
}

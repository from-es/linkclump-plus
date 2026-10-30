/**
 * initBackground Tests
 *
 * Verifies first-run initialization (default settings, content script injection, options window placement)
 * and that nothing happens for 'latest' and 'outdated' install states.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 */

import { describe, afterEach, beforeEach, vi } from "vitest";
import { browser } from "wxt/browser";
import { initBackground } from "@/entrypoints/background/init/initBackground";
import type { Deps } from "@/entrypoints/background/deps";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface Input {
	readonly installState: "first" | "latest" | "outdated";
	readonly screen: { readonly width: number, readonly height: number };
}

const testData = {
	successCases: [
		{
			name: "should initialize, inject and open a centered options window on first run",
			input: { installState: "first", screen: { width: 1920, height: 1080 } },
			expected: {
				initialized: 1,
				injected: 1,
				windows: [ { url: "chrome-extension://dummy-extension-id/options.html?init=true", width: 800, height: 850, left: 560, top: 190 } ]
			}
		},
		{
			name: "should open the options window without position when the screen size is unknown",
			input: { installState: "first", screen: { width: 0, height: 0 } },
			expected: {
				initialized: 1,
				injected: 1,
				windows: [ { url: "chrome-extension://dummy-extension-id/options.html?init=true", width: 800, height: 850 } ]
			}
		},
		{ name: "should do nothing when the install state is 'latest'", input: { installState: "latest", screen: { width: 1920, height: 1080 } }, expected: { initialized: 0, injected: 0, windows: [] } },
		{ name: "should do nothing when the install state is 'outdated'", input: { installState: "outdated", screen: { width: 1920, height: 1080 } }, expected: { initialized: 0, injected: 0, windows: [] } }
	]
} as const satisfies Record<string, readonly TestCase<Input>[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

describe("initBackground", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(browser.windows.create).mockResolvedValue({ id: 1 } as never);
	});

	afterEach(() => {
		Reflect.deleteProperty(screen, "width");
		Reflect.deleteProperty(screen, "height");
	});

	describe("Success cases", () => {
		TestRunner.success(testData.successCases, undefined, async ({ installState, screen: size }: Input) => {
			Object.defineProperty(screen, "width", { configurable: true, value: size.width });
			Object.defineProperty(screen, "height", { configurable: true, value: size.height });
			const initialize = vi.fn().mockResolvedValue(undefined);
			const injectIntoExistingTabs = vi.fn().mockResolvedValue(undefined);
			const deps = {
				settingsManager: { getInstallState: vi.fn().mockResolvedValue(installState), initialize },
				contentScriptManager: { injectIntoExistingTabs }
			} as unknown as Deps;

			await initBackground(deps);

			return {
				initialized: initialize.mock.calls.length,
				injected: injectIntoExistingTabs.mock.calls.length,
				windows: vi.mocked(browser.windows.create).mock.calls.map(([ options ]) => options)
			};
		});
	});
});

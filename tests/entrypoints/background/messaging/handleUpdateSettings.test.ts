/**
 * handleUpdateSettings Tests
 *
 * Verifies that valid settings are saved and broadcast, and that invalid settings are rejected with a warning.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link project/tests/shared/types/validation.ts} - Standard type for validation tests
 */

import { describe, afterEach, beforeEach, vi } from "vitest";
import { handleUpdateSettings } from "@/entrypoints/background/messaging/handleUpdateSettings";
import type { Deps } from "@/entrypoints/background/deps";
import type { UpdateMessage } from "@/assets/js/types/Messages";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

const VALID_SETTINGS = { actions: {}, blocked: [ "example\\.com" ] };

const testData = {
	successCases: [
		{
			name: "should save valid settings and then broadcast them",
			input: { message: "update", settings: VALID_SETTINGS } as IntentionalAnyForValidation,
			expected: { saved: [ VALID_SETTINGS ], broadcasts: 1, warnings: 0 }
		},
		{
			name: "should reject invalid settings with a warning and neither save nor broadcast",
			input: { message: "update", settings: { actions: null, blocked: [] } } as IntentionalAnyForValidation,
			expected: { saved: [], broadcasts: 0, warnings: 1 }
		},
		{
			name: "should reject missing settings",
			input: { message: "update" } as IntentionalAnyForValidation,
			expected: { saved: [], broadcasts: 0, warnings: 1 }
		}
	]
} as const satisfies Record<string, readonly TestCase<UpdateMessage>[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

/**
 * Creates fresh mocks and the dependencies built from them.
 *
 * @returns Mocks and the `Deps` object passed to the handler.
 */
function createContext() {
	const save = vi.fn().mockResolvedValue(undefined);
	const broadcastSettingsUpdate = vi.fn().mockResolvedValue(undefined);
	const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
	const deps = { settingsManager: { save }, contentScriptManager: { broadcastSettingsUpdate } } as unknown as Deps;

	return { save, broadcastSettingsUpdate, warnSpy, deps };
}

describe("handleUpdateSettings", () => {
	let context: ReturnType<typeof createContext>;

	beforeEach(() => {
		context = createContext();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Success cases", () => {
		TestRunner.success(testData.successCases, () => context, async (request, { save, broadcastSettingsUpdate, warnSpy, deps }) => {
			await handleUpdateSettings(request, deps);

			return {
				saved: save.mock.calls.map(([ settings ]) => settings),
				broadcasts: broadcastSettingsUpdate.mock.calls.length,
				warnings: warnSpy.mock.calls.length
			};
		});
	});
});

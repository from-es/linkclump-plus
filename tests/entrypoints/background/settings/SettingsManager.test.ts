/**
 * SettingsManager Tests
 *
 * Verifies initialization, install state detection, loading with fallback to defaults, saving, and migration.
 * Storage is replaced with an in-memory fake.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link project/tests/shared/types/validation.ts} - Standard type for validation tests
 */

import { describe, beforeEach, expect, vi } from "vitest";
import { SettingsManager } from "@/entrypoints/background/settings/SettingsManager";
import { CURRENT_VERSION, linkclumpSettingsKey, linkclumpVersionKey } from "@/assets/js/constants/setting";
import type { StorageManager } from "@/entrypoints/background/settings/StorageManager";
import type { Settings } from "@/assets/js/types/Settings";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface VersionInput {
	/** Version preloaded into storage. When omitted, storage is empty. */
	readonly storedVersion?: string;
}

const EXISTING_SETTINGS: Settings = {
	actions: { 101: { action: "tabs", color: "#FFA500", key: 90, mouse: 0, options: {} as IntentionalAnyForValidation } },
	blocked: [ "test\\.org" ]
};

const testData = {
	installStateCases: [
		{ name: "should return install state 'first' when version is undefined", input: {}, expected: "first" },
		{ name: "should return install state 'latest' when stored version matches CURRENT_VERSION", input: { storedVersion: CURRENT_VERSION }, expected: "latest" },
		{ name: "should return install state 'outdated' when stored version is different", input: { storedVersion: "1" }, expected: "outdated" }
	],
	initializeCases: [
		{
			name: "should initialize storage with default settings and current version",
			input: undefined,
			expected: { hasActions: true, hasBlocked: true, storedVersion: CURRENT_VERSION }
		}
	],
	loadExistingCases: [
		{
			name: "should load existing valid settings from storage without re-initializing",
			input: EXISTING_SETTINGS,
			expected: { loaded: EXISTING_SETTINGS, setCalls: [] }
		}
	],
	loadCorruptedCases: [
		{
			name: "should initialize default settings when loading if stored settings are missing or corrupted",
			input: null,
			expected: {
				hasActions: true,
				setCalls: [ [ linkclumpSettingsKey, expect.any(Object) ], [ linkclumpVersionKey, CURRENT_VERSION ] ]
			}
		}
	],
	saveCases: [
		{
			name: "should clean error property before saving settings",
			input: { actions: {}, blocked: [], error: "Some transient error" },
			expected: { actions: {}, blocked: [] }
		}
	],
	migrateCases: [
		{
			name: "should migrate if needed when install state is 'first'",
			input: undefined,
			expected: { storedVersion: CURRENT_VERSION, settingsStored: true }
		}
	]
} as const satisfies Record<string, readonly TestCase[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

/**
 * Creates an in-memory storage fake and a manager that uses it.
 *
 * @returns The fake store, the mocked storage manager, and the manager under test.
 */
function createContext() {
	const memoryStore: Record<string, unknown> = {};
	const storageManager = {
		get: vi.fn(async (key: string) => memoryStore[key]),
		set: vi.fn(async (key: string, value: unknown) => {
			memoryStore[key] = value;
		})
	};
	const manager = new SettingsManager(storageManager as unknown as StorageManager);

	return { memoryStore, storageManager, manager };
}

describe("SettingsManager", () => {
	let context: ReturnType<typeof createContext>;

	beforeEach(() => {
		// Arrange: Fresh in-memory storage per test
		context = createContext();
	});

	describe("initialize", () => {
		TestRunner.success(testData.initializeCases, () => context, async (_input, { memoryStore, manager }) => {
			const settings = await manager.initialize();

			// The stored settings must equal the returned ones (a relation that static expected data cannot express).
			expect(memoryStore[linkclumpSettingsKey]).toEqual(settings);

			return {
				hasActions: settings.actions !== undefined,
				hasBlocked: settings.blocked !== undefined,
				storedVersion: memoryStore[linkclumpVersionKey]
			};
		});
	});

	describe("getInstallState", () => {
		TestRunner.success(testData.installStateCases, () => context, async ({ storedVersion }: VersionInput, { memoryStore, manager }) => {
			if (storedVersion !== undefined) {
				memoryStore[linkclumpVersionKey] = storedVersion;
			}

			return await manager.getInstallState();
		}, { matcher: "toBe" });
	});

	describe("load", () => {
		describe("Existing valid settings", () => {
			TestRunner.success(testData.loadExistingCases, () => context, async (stored, { memoryStore, storageManager, manager }) => {
				memoryStore[linkclumpSettingsKey] = stored;

				const loaded = await manager.load();

				return { loaded, setCalls: storageManager.set.mock.calls };
			});
		});

		describe("Missing or corrupted settings", () => {
			TestRunner.success(testData.loadCorruptedCases, () => context, async (stored, { memoryStore, storageManager, manager }) => {
				memoryStore[linkclumpSettingsKey] = stored;

				const loaded = await manager.load();

				return { hasActions: loaded.actions !== undefined, setCalls: storageManager.set.mock.calls };
			});
		});
	});

	describe("save", () => {
		TestRunner.success(testData.saveCases, () => context, async (settings, { memoryStore, manager }) => {
			// Copy the readonly literal data into the mutable shape that `save` accepts.
			await manager.save({ ...settings, blocked: [ ...settings.blocked ] });

			return memoryStore[linkclumpSettingsKey];
		});
	});

	describe("migrateIfNeeded", () => {
		TestRunner.success(testData.migrateCases, () => context, async (_input, { memoryStore, manager }) => {
			await manager.migrateIfNeeded();

			return {
				storedVersion: memoryStore[linkclumpVersionKey],
				settingsStored: memoryStore[linkclumpSettingsKey] !== undefined
			};
		});
	});
});

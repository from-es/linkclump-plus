/**
 * StorageManager Tests
 *
 * Verifies that the thin wrapper reads and writes single keys in browser.storage.sync.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 */

import { describe, beforeEach, vi } from "vitest";
import { browser } from "wxt/browser";
import { StorageManager } from "@/entrypoints/background/settings/StorageManager";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

const testData = {
	getCases: [
		{ name: "should return the value stored under the key", input: { key: "k", stored: { k: { a: 1 }, other: 2 } }, expected: { a: 1 } },
		{ name: "should return undefined when the key is not stored", input: { key: "k", stored: {} }, expected: undefined }
	],
	setCases: [
		{ name: "should store the value wrapped in an object keyed by the key", input: { key: "k", value: [ 1, 2 ] }, expected: [ { k: [ 1, 2 ] } ] }
	]
} as const satisfies Record<string, readonly TestCase[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

describe("StorageManager", () => {
	let manager: StorageManager;

	beforeEach(() => {
		vi.clearAllMocks();
		manager = new StorageManager();
	});

	describe("get", () => {
		TestRunner.success(testData.getCases, undefined, ({ key, stored }: { key: string, stored: object }) => {
			vi.mocked(browser.storage.sync.get).mockResolvedValue(stored as never);

			return manager.get(key);
		});
	});

	describe("set", () => {
		TestRunner.success(testData.setCases, undefined, async ({ key, value }: { key: string, value: unknown }) => {
			vi.mocked(browser.storage.sync.set).mockResolvedValue(undefined as never);

			await manager.set(key, value);

			return vi.mocked(browser.storage.sync.set).mock.calls.map(([ items ]) => items);
		});
	});
});

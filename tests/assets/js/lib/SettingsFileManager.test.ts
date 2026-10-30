/**
 * SettingsFileManager Tests
 *
 * Verifies settings file export (download trigger and filename generation) and import (dialog cancellation).
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 */

import { describe, afterEach, beforeEach, vi } from "vitest";
import { browser } from "wxt/browser";
import { exportFile, importFile } from "@/assets/js/lib/SettingsFileManager";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface ImportInput {
	readonly pick: "cancel" | "file" | "empty";
	readonly name?: string;
	readonly type?: string;
	readonly content?: string;
}

interface ExportInput {
	/** Simulates a failure of browser.runtime.getManifest. */
	readonly manifestThrows?: boolean;
	readonly data: unknown;
	readonly filename?: string;
	readonly manifest?: { readonly name: string, readonly version: string };
}

const testData = {
	exportCases: [
		{
			name: "should trigger file download with specified filename",
			input: { data: { test: "data" }, filename: "custom-settings.json" },
			expected: { success: true, clickCalls: 1, objectUrlCalls: 1, downloadName: "custom-settings.json" }
		},
		{
			name: "should generate default timestamped filename when no filename is given",
			input: { data: { test: 123 }, manifest: { name: "Linkclump Plus", version: "2.17.1" } },
			expected: { success: true, clickCalls: 1, objectUrlCalls: 1, downloadName: "Linkclump-Plus_v2.17.1_2026-10-27_23-45-00.json" }
		}
	],
	filenameCases: [
		{
			name: "should use the runtime manifest when no manifest is given",
			input: { data: {} },
			expected: { success: true, clickCalls: 1, objectUrlCalls: 1, downloadName: "Linkclump-Plus_v2.17.1_2026-10-27_23-45-00.json" }
		},
		{
			name: "should fall back to default identity when the runtime manifest cannot be read",
			input: { data: {}, manifestThrows: true },
			expected: { success: true, clickCalls: 1, objectUrlCalls: 1, downloadName: "settings_v0.0.0_2026-10-27_23-45-00.json" }
		},
		{
			name: "should strip OS-reserved and control characters from the name and version",
			input: { data: {}, manifest: { name: "My:Ext/<>|?*\u0001 Name", version: "1.0" } },
			expected: { success: true, clickCalls: 1, objectUrlCalls: 1, downloadName: "MyExt-Name_v1.0_2026-10-27_23-45-00.json" }
		},
		{
			name: "should use the fallback when the sanitized name or version becomes empty",
			input: { data: {}, manifest: { name: " :/ ", version: "..." } },
			expected: { success: true, clickCalls: 1, objectUrlCalls: 1, downloadName: "settings_v0.0.0_2026-10-27_23-45-00.json" }
		}
	],
	exportFailureCases: [
		{ name: "should return false when the download cannot be started", input: { data: {} }, expected: false }
	],
	importCases: [
		{ name: "should return null if file dialog is canceled", input: { pick: "cancel" }, expected: null },
		{ name: "should return parsed data for a JSON file", input: { pick: "file", name: "s.json", type: "application/json", content: "{\"a\":1}" }, expected: { a: 1 } },
		{ name: "should accept a .json file name even when the MIME type is empty", input: { pick: "file", name: "S.JSON", type: "", content: "[1,2]" }, expected: [ 1, 2 ] },
		{ name: "should return null for a file that is neither JSON MIME nor .json", input: { pick: "file", name: "s.txt", type: "text/plain", content: "{}" }, expected: null },
		{ name: "should return null for malformed JSON", input: { pick: "file", name: "s.json", type: "application/json", content: "{broken" }, expected: null },
		{ name: "should return null when no file was selected", input: { pick: "empty" }, expected: null }
	]
} as const satisfies Record<string, readonly TestCase[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

/**
 * Stubs the browser APIs used to trigger a download and records the filename of each triggered download.
 *
 * @returns Spies and the list of downloaded filenames.
 */
function createDownloadSpies() {
	const downloadNames: string[] = [];
	const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function(this: HTMLAnchorElement) {
		downloadNames.push(this.download);
	});
	const createObjectURLSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:dummy-object-url");

	return { clickSpy, createObjectURLSpy, downloadNames };
}

describe("SettingsFileManager", () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe("exportFile", () => {
		let spies: ReturnType<typeof createDownloadSpies>;

		beforeEach(() => {
			// Arrange: Fix only Date so the timestamped filename is deterministic (timers stay real)
			vi.useFakeTimers({ toFake: [ "Date" ] });
			vi.setSystemTime(new Date(2026, 9, 27, 23, 45, 0));
			spies = createDownloadSpies();
		});

		TestRunner.success(testData.exportCases, () => spies, ({ data, filename, manifest }: ExportInput, { clickSpy, createObjectURLSpy, downloadNames }) => {
			const success = exportFile(data, filename, manifest);

			return {
				success,
				clickCalls: clickSpy.mock.calls.length,
				objectUrlCalls: createObjectURLSpy.mock.calls.length,
				downloadName: downloadNames[0]
			};
		});
	});

	describe("exportFile (default filename)", () => {
		let spies: ReturnType<typeof createDownloadSpies>;

		beforeEach(() => {
			vi.useFakeTimers({ toFake: [ "Date" ] });
			vi.setSystemTime(new Date(2026, 9, 27, 23, 45, 0));
			vi.spyOn(console, "warn").mockImplementation(() => {});
			spies = createDownloadSpies();
		});

		TestRunner.success(testData.filenameCases, () => spies, ({ data, manifest, manifestThrows }: ExportInput, { clickSpy, createObjectURLSpy, downloadNames }) => {
			if (manifestThrows) {
				vi.spyOn(browser.runtime, "getManifest").mockImplementation(() => {
					throw new Error("Extension context invalidated.");
				});
			}
			const success = exportFile(data, undefined, manifest);

			return {
				success,
				clickCalls: clickSpy.mock.calls.length,
				objectUrlCalls: createObjectURLSpy.mock.calls.length,
				downloadName: downloadNames[0]
			};
		});
	});

	describe("exportFile (failure)", () => {
		beforeEach(() => {
			vi.spyOn(console, "error").mockImplementation(() => {});
			vi.spyOn(URL, "createObjectURL").mockImplementation(() => {
				throw new Error("createObjectURL failed");
			});
		});

		TestRunner.success(testData.exportFailureCases, undefined, ({ data }: ExportInput) => exportFile(data, "a.json"), { matcher: "toBe" });
	});

	describe("importFile", () => {
		beforeEach(() => {
			vi.spyOn(console, "error").mockImplementation(() => {});
		});

		TestRunner.success(testData.importCases, undefined, ({ pick, name, type, content }: ImportInput) => {
			// Arrange: Simulate the user's choice in the file dialog
			vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function(this: HTMLInputElement) {
				setTimeout(() => {
					if (pick === "cancel") {
						this.oncancel?.(new Event("cancel"));
						return;
					}
					const files = pick === "file" ? [ new File([ content ?? "" ], name ?? "", { type }) ] : [];
					Object.defineProperty(this, "files", { configurable: true, value: files });
					this.dispatchEvent(new Event("change"));
				}, 0);
			});

			return importFile();
		});
	});
});

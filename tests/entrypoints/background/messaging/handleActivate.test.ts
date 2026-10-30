/**
 * handleActivate Tests
 *
 * Verifies URL preprocessing (duplicate removal, reversing, empty guard) and dispatching to the action handler.
 * The action handlers themselves are mocked; they have their own tests.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link project/tests/shared/types/validation.ts} - Standard type for validation tests
 */

import { describe, beforeEach, vi } from "vitest";
import { handleActivate } from "@/entrypoints/background/messaging/handleActivate";
import { handleBookmark } from "@/entrypoints/background/actions/bookmark";
import { handleCopyToClipboard } from "@/entrypoints/background/actions/copyToClipboard";
import { handleOpenNewTabs } from "@/entrypoints/background/actions/openNewTabs";
import { handleOpenNewWin } from "@/entrypoints/background/actions/openNewWin";
import type { ActivateMessage } from "@/assets/js/types/Messages";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

vi.mock("@/entrypoints/background/actions/bookmark", () => ({ handleBookmark: vi.fn() }));
vi.mock("@/entrypoints/background/actions/copyToClipboard", () => ({ handleCopyToClipboard: vi.fn() }));
vi.mock("@/entrypoints/background/actions/openNewTabs", () => ({ handleOpenNewTabs: vi.fn() }));
vi.mock("@/entrypoints/background/actions/openNewWin", () => ({ handleOpenNewWin: vi.fn() }));

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface Input {
	readonly action: string;
	readonly urls: readonly string[];
	readonly options: { readonly block?: boolean, readonly reverse?: boolean };
}

const testData = {
	dispatchCases: [
		{ name: "should dispatch 'copy' to handleCopyToClipboard", input: { action: "copy", urls: [ "a" ], options: {} }, expected: { handler: "copy", urls: [ "a" ] } },
		{ name: "should dispatch 'bm' to handleBookmark", input: { action: "bm", urls: [ "a" ], options: {} }, expected: { handler: "bm", urls: [ "a" ] } },
		{ name: "should dispatch 'win' to handleOpenNewWin", input: { action: "win", urls: [ "a" ], options: {} }, expected: { handler: "win", urls: [ "a" ] } },
		{ name: "should dispatch 'tabs' to handleOpenNewTabs", input: { action: "tabs", urls: [ "a" ], options: {} }, expected: { handler: "tabs", urls: [ "a" ] } },
		{ name: "should dispatch nothing for an unknown action", input: { action: "unknown", urls: [ "a" ], options: {} }, expected: { handler: undefined, urls: undefined } }
	],
	preprocessCases: [
		{ name: "should remove duplicate URLs when the block option is set", input: { action: "tabs", urls: [ "a", "b", "a" ], options: { block: true } }, expected: { handler: "tabs", urls: [ "a", "b" ] } },
		{ name: "should keep duplicate URLs when the block option is off", input: { action: "tabs", urls: [ "a", "b", "a" ], options: { block: false } }, expected: { handler: "tabs", urls: [ "a", "b", "a" ] } },
		{ name: "should reverse the URL order when the reverse option is set", input: { action: "tabs", urls: [ "a", "b", "c" ], options: { reverse: true } }, expected: { handler: "tabs", urls: [ "c", "b", "a" ] } },
		{ name: "should dispatch nothing when there are no URLs", input: { action: "tabs", urls: [], options: {} }, expected: { handler: undefined, urls: undefined } }
	]
} as const satisfies Record<string, readonly TestCase<Input>[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

/**
 * Runs handleActivate and reports which handler received which URLs.
 *
 * @param {Input} input - Case input.
 * @returns The called handler key and the URLs it received.
 */
function dispatch({ action, urls, options }: Input) {
	const request = {
		message: "activate",
		urls: urls.map((url) => ({ url, title: url })),
		setting: { action, options }
	} as IntentionalAnyForValidation as ActivateMessage;
	const handlers = { copy: handleCopyToClipboard, bm: handleBookmark, win: handleOpenNewWin, tabs: handleOpenNewTabs };

	handleActivate(request, {});

	for (const [ key, handler ] of Object.entries(handlers)) {
		const call = vi.mocked(handler).mock.calls[0];
		if (call) {
			return { handler: key, urls: call[0].urls.map((link) => link.url) };
		}
	}

	return { handler: undefined, urls: undefined };
}

describe("handleActivate", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Dispatching", () => {
		TestRunner.success(testData.dispatchCases, undefined, dispatch);
	});

	describe("Preprocessing", () => {
		TestRunner.success(testData.preprocessCases, undefined, dispatch);
	});
});

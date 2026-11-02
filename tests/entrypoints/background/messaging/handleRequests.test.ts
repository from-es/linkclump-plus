/**
 * handleRequests Tests
 *
 * Verifies the messaging protocol: synchronous return values (which keep the message channel open),
 * asynchronous replies for 'init', and the failure reply when loading settings fails.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link project/tests/shared/types/validation.ts} - Standard type for validation tests
 */

import { describe, afterEach, beforeEach, expect, vi } from "vitest";
import { handleRequests } from "@/entrypoints/background/messaging/handleRequests";
import { handleActivate } from "@/entrypoints/background/messaging/handleActivate";
import { handleUpdateSettings } from "@/entrypoints/background/messaging/handleUpdateSettings";
import type { Deps } from "@/entrypoints/background/deps";
import type { InitMessage, Messages } from "@/assets/js/types/Messages";
import type { Browser } from "wxt/browser";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

vi.mock("@/entrypoints/background/messaging/handleActivate", () => ({ handleActivate: vi.fn() }));
vi.mock("@/entrypoints/background/messaging/handleUpdateSettings", () => ({ handleUpdateSettings: vi.fn().mockResolvedValue(undefined) }));

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface RequestInput {
	readonly request: Messages;
}

interface LoadInput extends RequestInput {
	/** Behavior of the mocked `settingsManager.load`. */
	readonly load: () => Promise<unknown>;
}

const INIT_REQUEST: InitMessage = { message: "init" };
const ACTIVATE_REQUEST = { message: "activate", urls: [], setting: {} } as IntentionalAnyForValidation as Messages;
const UPDATE_REQUEST = { message: "update", settings: { actions: {}, blocked: [] } } as IntentionalAnyForValidation as Messages;
const LOADED_SETTINGS = { actions: { 101: {} }, blocked: [] };

const testData = {
	returnValueCases: [
		{ name: "should return true synchronously for 'init' message to maintain the port", input: { request: INIT_REQUEST }, expected: true },
		{ name: "should return false synchronously for 'activate' message", input: { request: ACTIVATE_REQUEST }, expected: false },
		{ name: "should return false synchronously for 'update' message", input: { request: UPDATE_REQUEST }, expected: false },
		{
			name: "should return false synchronously for unknown messages",
			input: { request: { message: "unknown_message_type" } as IntentionalAnyForValidation },
			expected: false
		}
	],
	dispatchCases: [
		{ name: "should delegate 'activate' message to handleActivate with the sender", input: { request: ACTIVATE_REQUEST }, expected: { activateCalls: 1, updateCalls: 0 } },
		{ name: "should delegate 'update' message to handleUpdateSettings", input: { request: UPDATE_REQUEST }, expected: { activateCalls: 0, updateCalls: 1 } },
		{ name: "should not delegate 'init' message", input: { request: INIT_REQUEST }, expected: { activateCalls: 0, updateCalls: 0 } }
	],
	noResponseCases: [
		{
			name: "should not call sendResponse for unknown messages",
			input: { request: { message: "unknown_message_type" } as IntentionalAnyForValidation },
			expected: 0
		}
	],
	asyncResponseCases: [
		{
			name: "should call sendResponse with loaded settings asynchronously for 'init' message",
			input: { request: INIT_REQUEST, load: () => Promise.resolve(LOADED_SETTINGS) },
			expected: { responseArgs: [ LOADED_SETTINGS ], loadCalls: 1 }
		},
		{
			name: "should call sendResponse(undefined) when settingsManager.load fails",
			input: { request: INIT_REQUEST, load: () => Promise.reject(new Error("Storage load failed")) },
			expected: { responseArgs: [ undefined ], loadCalls: 1 }
		}
	],
	syncErrorCases: [
		{
			name: "should catch synchronous errors in handleActivate without crashing",
			input: { request: ACTIVATE_REQUEST },
			expected: { returned: false, errorLogged: true }
		}
	]
} as const satisfies Record<string, readonly TestCase[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

const DUMMY_SENDER: Browser.runtime.MessageSender = { id: "test-sender" };

/**
 * Creates fresh mocks and the dependencies built from them.
 *
 * @returns Mocks and the `Deps` object passed to the handler.
 */
function createContext() {
	const load = vi.fn();
	const sendResponse = vi.fn();
	const deps = {
		settingsManager: { load, save: vi.fn(), init: vi.fn() },
		contentScriptManager: { broadcastSettingsUpdate: vi.fn() }
	} as unknown as Deps;

	return { load, sendResponse, deps };
}

describe("handleRequests messaging protocol (H2 migration)", () => {
	let context: ReturnType<typeof createContext>;

	beforeEach(() => {
		// Arrange: Fresh mocks per test; silence the error that safeAsync logs when load fails
		context = createContext();
		vi.mocked(handleActivate).mockClear();
		vi.mocked(handleUpdateSettings).mockClear();
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Return values", () => {
		TestRunner.success(testData.returnValueCases, () => context, ({ request }: RequestInput, { sendResponse, deps }) => {
			return handleRequests(request, DUMMY_SENDER, sendResponse, deps);
		}, { matcher: "toBe" });
	});

	describe("Delegation", () => {
		TestRunner.success(testData.dispatchCases, () => context, async ({ request }: RequestInput, { sendResponse, deps }) => {
			handleRequests(request, DUMMY_SENDER, sendResponse, deps);
			await Promise.resolve();

			return {
				activateCalls: vi.mocked(handleActivate).mock.calls.length,
				updateCalls: vi.mocked(handleUpdateSettings).mock.calls.length
			};
		});
	});

	describe("No response", () => {
		TestRunner.success(testData.noResponseCases, () => context, ({ request }: RequestInput, { sendResponse, deps }) => {
			handleRequests(request, DUMMY_SENDER, sendResponse, deps);

			return sendResponse.mock.calls.length;
		}, { matcher: "toBe" });
	});

	describe("Asynchronous responses", () => {
		TestRunner.success(testData.asyncResponseCases, () => context, async ({ request, load }: LoadInput, { load: loadMock, sendResponse, deps }) => {
			loadMock.mockImplementation(load);

			handleRequests(request, DUMMY_SENDER, sendResponse, deps);
			// Wait for the reply instead of sleeping for a fixed time.
			await vi.waitFor(() => expect(sendResponse).toHaveBeenCalledTimes(1));

			return { responseArgs: sendResponse.mock.calls[0], loadCalls: loadMock.mock.calls.length };
		});
	});

	describe("Synchronous error handling", () => {
		TestRunner.success(testData.syncErrorCases, () => context, async ({ request }: RequestInput, { sendResponse, deps }) => {
			vi.mocked(handleActivate).mockImplementationOnce(() => {
				throw new Error("Simulated synchronous error");
			});

			const returned = handleRequests(request, DUMMY_SENDER, sendResponse, deps);
			await vi.waitFor(() => expect(console.error).toHaveBeenCalled());

			const errorLogged = vi.mocked(console.error).mock.calls.some(([ msg ]) =>
				typeof msg === "string" && msg.includes("[background] Error in handleActivate:")
			);

			return { returned, errorLogged };
		});
	});
});

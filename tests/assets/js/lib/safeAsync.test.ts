/**
 * safeAsync Tests
 *
 * Verifies that fire-and-forget tasks are executed and that synchronous throws and Promise rejections are logged with scope.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 */

import { describe, afterEach, beforeEach, expect, vi } from "vitest";
import { safeAsync } from "@/assets/js/lib/safeAsync";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface TaskInput {
	readonly taskName: string;
	readonly delayMs?: number;
}

interface FailureInput {
	readonly taskName: string;
	readonly task: () => unknown;
	readonly scope?: string;
}

const SYNC_ERROR = new Error("Sync failure");
const ASYNC_ERROR = new Error("Async rejection");

const testData = {
	syncCases: [
		{ name: "should execute synchronous tasks immediately without error", input: { taskName: "syncTask" }, expected: { calls: 1, errorCalls: 0 } }
	],
	asyncCases: [
		{ name: "should execute asynchronous tasks without error", input: { taskName: "asyncTask", delayMs: 10 }, expected: { completed: true, errorCalls: 0 } }
	],
	failureCases: [
		{
			name: "should catch synchronous errors and log them with scope",
			input: {
				taskName: "syncFailure",
				task: () => {
					throw SYNC_ERROR;
				},
				scope: "content"
			},
			expected: [ "[content] Error in syncFailure:", SYNC_ERROR ]
		},
		{
			name: "should catch asynchronous rejections and log them with default scope",
			input: {
				taskName: "asyncFailure",
				task: async () => {
					await new Promise((_, reject) => setTimeout(() => reject(ASYNC_ERROR), 5));
				}
			},
			expected: [ "[safeAsync] Error in asyncFailure:", ASYNC_ERROR ]
		}
	]
} as const satisfies Record<string, readonly TestCase[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

/**
 * Silences `console.error` and returns the spy so that logged calls can be inspected.
 *
 * @returns The `console.error` spy.
 */
function createErrorSpy() {
	return vi.spyOn(console, "error").mockImplementation(() => {});
}

describe("safeAsync", () => {
	let errorSpy: ReturnType<typeof createErrorSpy>;

	beforeEach(() => {
		// Arrange: Silence and capture console.error
		errorSpy = createErrorSpy();
	});

	afterEach(() => {
		errorSpy.mockRestore();
	});

	describe("Task execution", () => {
		TestRunner.success(testData.syncCases, () => errorSpy, ({ taskName }: TaskInput, spy) => {
			const task = vi.fn();

			safeAsync(taskName, task);

			// A synchronous task must run immediately, before any microtask is flushed.
			return { calls: task.mock.calls.length, errorCalls: spy.mock.calls.length };
		});

		TestRunner.success(testData.asyncCases, () => errorSpy, async ({ taskName, delayMs }: TaskInput, spy) => {
			let completed = false;

			safeAsync(taskName, async () => {
				await new Promise((resolve) => setTimeout(resolve, delayMs));
				completed = true;
			});
			await vi.waitFor(() => expect(completed).toBe(true));

			return { completed, errorCalls: spy.mock.calls.length };
		});
	});

	describe("Error logging", () => {
		TestRunner.success(testData.failureCases, () => errorSpy, async ({ taskName, task, scope }: FailureInput, spy) => {
			safeAsync(taskName, task, scope);
			await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

			return spy.mock.calls[0];
		});
	});
});

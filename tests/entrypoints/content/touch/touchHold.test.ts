/**
 * touchHold Tests
 *
 * Verifies the touch hold state machine: the pure move-cancellation check, arming (primary pointer only),
 * confirmation after the timeout, cancellation, and re-arming. The module keeps its state at module level,
 * so every test cancels any pending hold afterwards.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 */

import { describe, afterEach, beforeEach, vi } from "vitest";
import {
	armTouchHold,
	cancelTouchHold,
	getArmedTouchHold,
	isTouchHoldArmed,
	shouldCancelOnMove,
	type ArmedTouchHold
} from "@/entrypoints/content/touch/touchHold";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface MoveInput {
	readonly current: ArmedTouchHold | null;
	readonly pointerId: number;
	readonly x: number;
	readonly y: number;
	readonly threshold: number;
}

type Step =
	| { readonly type: "arm", readonly label: string, readonly primary?: boolean, readonly timeoutMs?: number, readonly pointerId?: number }
	| { readonly type: "advance", readonly ms: number }
	| { readonly type: "cancel" };

interface ScenarioInput {
	readonly steps: readonly Step[];
}

const HOLD: ArmedTouchHold = { pointerId: 1, startX: 100, startY: 200 };

const testData = {
	moveCases: [
		{ name: "should not cancel when nothing is armed", input: { current: null, pointerId: 1, x: 999, y: 999, threshold: 10 }, expected: false },
		{ name: "should not cancel for a different pointer", input: { current: HOLD, pointerId: 2, x: 999, y: 999, threshold: 10 }, expected: false },
		{ name: "should not cancel when the move stays within the threshold", input: { current: HOLD, pointerId: 1, x: 110, y: 190, threshold: 10 }, expected: false },
		{ name: "should cancel when the X distance exceeds the threshold", input: { current: HOLD, pointerId: 1, x: 111, y: 200, threshold: 10 }, expected: true },
		{ name: "should cancel when the Y distance exceeds the threshold", input: { current: HOLD, pointerId: 1, x: 100, y: 189, threshold: 10 }, expected: true }
	],
	scenarioCases: [
		{
			name: "should ignore a non-primary pointer",
			input: { steps: [ { type: "arm", label: "a", primary: false }, { type: "advance", ms: 1000 } ] },
			expected: { confirmed: [], cancelled: [], armed: false, armedState: null }
		},
		{
			name: "should be armed with the start position before the timeout",
			input: { steps: [ { type: "arm", label: "a", pointerId: 7, timeoutMs: 500 }, { type: "advance", ms: 499 } ] },
			expected: { confirmed: [], cancelled: [], armed: true, armedState: { pointerId: 7, startX: 10, startY: 20 } }
		},
		{
			name: "should confirm once after the timeout and clear the armed state without calling cancel",
			input: { steps: [ { type: "arm", label: "a", timeoutMs: 500 }, { type: "advance", ms: 500 } ] },
			expected: { confirmed: [ "a" ], cancelled: [], armed: false, armedState: null }
		},
		{
			name: "should not confirm again after the timeout has fired",
			input: { steps: [ { type: "arm", label: "a", timeoutMs: 500 }, { type: "advance", ms: 5000 } ] },
			expected: { confirmed: [ "a" ], cancelled: [], armed: false, armedState: null }
		},
		{
			name: "should cancel a pending hold, run its cancel callback and never confirm",
			input: { steps: [ { type: "arm", label: "a", timeoutMs: 500 }, { type: "cancel" }, { type: "advance", ms: 5000 } ] },
			expected: { confirmed: [], cancelled: [ "a" ], armed: false, armedState: null }
		},
		{
			name: "should treat cancel as a no-op when nothing is pending",
			input: { steps: [ { type: "cancel" }, { type: "cancel" } ] },
			expected: { confirmed: [], cancelled: [], armed: false, armedState: null }
		},
		{
			name: "should cancel the previous hold when a new one is armed",
			input: { steps: [ { type: "arm", label: "first", timeoutMs: 500 }, { type: "advance", ms: 200 }, { type: "arm", label: "second", timeoutMs: 500 }, { type: "advance", ms: 500 } ] },
			expected: { confirmed: [ "second" ], cancelled: [ "first" ], armed: false, armedState: null }
		},
		{
			name: "should keep a pending hold when a non-primary pointer tries to arm",
			input: { steps: [ { type: "arm", label: "a", timeoutMs: 500 }, { type: "arm", label: "b", primary: false, timeoutMs: 100 }, { type: "advance", ms: 500 } ] },
			expected: { confirmed: [ "a" ], cancelled: [], armed: false, armedState: null }
		}
	]
} as const satisfies Record<string, readonly TestCase[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

describe("touchHold", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		// Cleanup: The hold state is module-level, so drop any pending hold
		cancelTouchHold();
		vi.useRealTimers();
	});

	describe("shouldCancelOnMove", () => {
		TestRunner.success(testData.moveCases, undefined, ({ current, pointerId, x, y, threshold }: MoveInput) => shouldCancelOnMove(current, pointerId, x, y, threshold), { matcher: "toBe" });
	});

	describe("Hold lifecycle", () => {
		TestRunner.success(testData.scenarioCases, undefined, ({ steps }: ScenarioInput) => {
			const confirmed: string[] = [];
			const cancelled: string[] = [];

			for (const step of steps) {
				if (step.type === "arm") {
					armTouchHold(step.pointerId ?? 1, step.primary ?? true, 10, 20, () => confirmed.push(step.label), step.timeoutMs ?? 500, () => cancelled.push(step.label));
				} else if (step.type === "advance") {
					vi.advanceTimersByTime(step.ms);
				} else {
					cancelTouchHold();
				}
			}

			return { confirmed, cancelled, armed: isTouchHoldArmed(), armedState: getArmedTouchHold() };
		});
	});
});

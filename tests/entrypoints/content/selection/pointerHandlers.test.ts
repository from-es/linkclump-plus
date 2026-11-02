/**
 * Selection pointer handlers Tests
 *
 * Verifies the handlers that are only registered while a selection is active (pointermove, pointerout,
 * pointercancel, wheel, pointerup): trusted-event filtering, box tracking, the mouseup bounce timer,
 * pointer capture release, and event suppression.
 * The matching, box geometry and touch hold modules are mocked; they have their own tests.
 *
 * The click that follows a release is swallowed (suppressNextClick), so pressing on a link, dragging and releasing
 * does not activate that link; jsdom has no pointer-capture retargeting, so this verifies the handler contract
 * only and the browser behavior is covered by the manual page under `tests/page/click-after-release/`.
 *
 * Standard `it` block is used for the fixed defect verification section instead of `TestRunner` on purpose:
 * it verifies the integration behavior of the `pointerup()` bounce timer retry loop and message dispatch
 * when smart selection mode toggles at the release coordinates.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link project/tests/shared/support/contentWindow.ts} - Content script window state
 * @see {@link project/tests/shared/types/validation.ts} - Standard type for validation tests
 */

import { describe, it, afterEach, beforeEach, expect, vi } from "vitest";
import { browser } from "wxt/browser";
import { pointercancel, pointermove, pointerout, pointerup, preventEscalation, suppressNextClick, wheel } from "@/entrypoints/content/selection/lifecycle";
import { allowSelection } from "@/entrypoints/content/matching/allowSelection";
import { updateBox } from "@/entrypoints/content/dom/selectionBox";
import { CLICK_SUPPRESS_TIMEOUT_MS, MOUSEUP_BOUNCE_TIMEOUT_MS } from "@/assets/js/constants/timing";
import { resetContentWindow } from "../../../shared/support/contentWindow";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

vi.mock("@/entrypoints/content/matching/allowSelection", () => ({ allowSelection: vi.fn() }));
vi.mock("@/entrypoints/content/dom/selectionBox", () => ({ updateBox: vi.fn(), getXY: vi.fn(() => ({ x: 0, y: 0 })) }));
vi.mock("@/entrypoints/content/touch/touchHold", () => ({ cancelTouchHold: vi.fn() }));

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface MoveInput {
	readonly trusted: boolean;
	/** Return value of the (mocked) allowSelection. */
	readonly allowed: boolean;
	readonly scrollBugIgnore?: boolean;
	/** `window.timer` (a pending mouseup bounce timer when non-zero). */
	readonly timer?: number;
}

interface UpInput {
	readonly trusted: boolean;
	readonly allowed: boolean;
	readonly boxOn: boolean;
	/** `window.timer` before the event (non-zero = a bounce timer is already pending). */
	readonly timer?: number;
}

interface ClickInput {
	/** Event types dispatched, in order, on an element inside the page. */
	readonly events: readonly string[];
	/** Milliseconds advanced between suppressNextClick() and the first event (`null` = dispatched at once). */
	readonly elapsedMs: number | null;
}

/** Observed result of one dispatched click-like event. */
interface ClickResult {
	/** True when the default action was cancelled. */
	readonly prevented: boolean;
	/** True when the event propagated down to the page (was not stopped at `window`). */
	readonly reached: boolean;
}

const BODY_LOCKED = "none";

const testData = {
	moveCases: [
		{
			name: "should ignore untrusted events",
			input: { trusted: false, allowed: true },
			expected: { prevented: false, boxUpdates: [], stopped: false, scrollBugIgnore: false }
		},
		{
			name: "should resize the box to the pointer when the selection is still allowed",
			input: { trusted: true, allowed: true },
			expected: { prevented: true, boxUpdates: [ [ 30, 40 ] ], stopped: false, scrollBugIgnore: false }
		},
		{
			name: "should reset the scroll bug flag after updating the box",
			input: { trusted: true, allowed: true, scrollBugIgnore: true },
			expected: { prevented: true, boxUpdates: [ [ 30, 40 ] ], stopped: false, scrollBugIgnore: false }
		},
		{
			name: "should update the box while the scroll bug flag is set even if the selection is no longer allowed",
			input: { trusted: true, allowed: false, scrollBugIgnore: true },
			expected: { prevented: true, boxUpdates: [ [ 30, 40 ] ], stopped: false, scrollBugIgnore: false }
		},
		{
			name: "should stop the selection when it is no longer allowed",
			input: { trusted: true, allowed: false },
			expected: { prevented: true, boxUpdates: [], stopped: true, scrollBugIgnore: false }
		},
		{
			name: "should not stop while a mouseup bounce timer is pending",
			input: { trusted: true, allowed: false, timer: 7 },
			expected: { prevented: true, boxUpdates: [], stopped: false, scrollBugIgnore: false }
		}
	],
	outCases: [
		{
			name: "should track the pointer like a move and flag the next wheel event to be ignored",
			input: { trusted: true, allowed: true },
			expected: { prevented: true, boxUpdates: [ [ 30, 40 ] ], stopped: false, scrollBugIgnore: true }
		},
		{
			name: "should still flag the wheel event for an untrusted event",
			input: { trusted: false, allowed: true },
			expected: { prevented: false, boxUpdates: [], stopped: false, scrollBugIgnore: true }
		}
	],
	cancelCases: [
		{ name: "should stop the selection on a trusted pointercancel", input: { trusted: true }, expected: false },
		{ name: "should ignore an untrusted pointercancel", input: { trusted: false }, expected: true }
	],
	upCases: [
		{
			name: "should ignore untrusted events",
			input: { trusted: false, allowed: true, boxOn: true },
			expected: { prevented: false, timerSet: false, stopped: false, boxUpdates: [] }
		},
		{
			name: "should stop at once on a false alarm (the box never became active)",
			input: { trusted: true, allowed: true, boxOn: false },
			expected: { prevented: true, timerSet: false, stopped: true, boxUpdates: [] }
		},
		{
			name: "should wait for the bounce window before finishing an allowed selection",
			input: { trusted: true, allowed: true, boxOn: true },
			expected: { prevented: true, timerSet: true, stopped: false, boxUpdates: [] }
		},
		{
			name: "should cancel without opening links when the selection is no longer allowed",
			input: { trusted: true, allowed: false, boxOn: true },
			expected: { prevented: true, timerSet: false, stopped: true, boxUpdates: [] }
		},
		{
			name: "should leave a pending bounce timer alone",
			input: { trusted: true, allowed: true, boxOn: true, timer: 9 },
			expected: { prevented: true, timerSet: true, stopped: false, boxUpdates: [] }
		}
	],
	upFinishCases: [
		{
			name: "should update the box, open the links and stop after the bounce window",
			input: { trusted: true, allowed: true, boxOn: true },
			expected: { boxUpdates: [ [ 30, 40 ] ], stopped: true, timerReset: true }
		}
	],
	suppressCases: [
		{ name: "should cancel the click that follows the release", input: { events: [ "click" ], elapsedMs: null }, expected: [ { prevented: true, reached: false } ] },
		{ name: "should cancel the auxclick that follows the release", input: { events: [ "auxclick" ], elapsedMs: null }, expected: [ { prevented: true, reached: false } ] },
		{
			name: "should cancel only the first click",
			input: { events: [ "click", "click" ], elapsedMs: null },
			expected: [ { prevented: true, reached: false }, { prevented: false, reached: true } ]
		},
		{
			name: "should still cancel a click arriving just before the timeout elapses",
			input: { events: [ "click" ], elapsedMs: CLICK_SUPPRESS_TIMEOUT_MS - 1 },
			expected: [ { prevented: true, reached: false } ]
		},
		{
			name: "should not touch a click that arrives after the timeout elapses",
			input: { events: [ "click" ], elapsedMs: CLICK_SUPPRESS_TIMEOUT_MS },
			expected: [ { prevented: false, reached: true } ]
		}
	],
	upClickCases: [
		{ name: "should cancel the following click when a selection box was shown", input: { boxOn: true }, expected: true },
		{ name: "should leave the following click alone on a false alarm (no selection box)", input: { boxOn: false }, expected: false }
	],
	captureCases: [
		{ name: "should release the pointer capture held by the target", input: { hasCapture: true, throws: false }, expected: 1 },
		{ name: "should not release a capture the target does not hold", input: { hasCapture: false, throws: false }, expected: 0 },
		{ name: "should ignore errors while releasing the capture", input: { hasCapture: true, throws: true }, expected: 1 }
	]
} as const satisfies Record<string, readonly TestCase[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

/**
 * Creates a minimal pointer event at page position (30, 40).
 *
 * @param {boolean} trusted - Value of `isTrusted`.
 * @param {EventTarget | null} [target] - Event target.
 * @returns The event and its preventDefault/stopPropagation spies.
 */
function createEvent(trusted: boolean, target: EventTarget | null = null) {
	const preventDefault = vi.fn();
	const stopPropagation = vi.fn();
	const event = { isTrusted: trusted, pageX: 30, pageY: 40, pointerId: 1, target, preventDefault, stopPropagation } as unknown as PointerEvent;

	return { event, preventDefault, stopPropagation };
}

/**
 * Checks whether stop() ran, using its observable effect of re-enabling text selection.
 *
 * @returns True if text selection was re-enabled on the page.
 */
function wasStopped(): boolean {
	return document.body.style.userSelect === "";
}

/**
 * Dispatches click-like events on a fresh element inside the page and reports what happened to each.
 *
 * @param {readonly string[]} types - Event types to dispatch, in order.
 * @returns {ClickResult[]} One result per dispatched event.
 */
function dispatchOnPage(types: readonly string[]): ClickResult[] {
	const target = document.createElement("a");
	document.body.append(target);

	let reached = false;
	const markReached = (): void => {
		reached = true;
	};
	document.addEventListener("click", markReached);
	document.addEventListener("auxclick", markReached);

	const results = types.map((type) => {
		reached = false;
		const event = new MouseEvent(type, { bubbles: true, cancelable: true });

		target.dispatchEvent(event);

		return { prevented: event.defaultPrevented, reached };
	});

	document.removeEventListener("click", markReached);
	document.removeEventListener("auxclick", markReached);

	return results;
}

describe("selection pointer handlers", () => {
	beforeEach(() => {
		// Arrange: Idle window state; the page is "locked" for text selection like during a real selection
		vi.useFakeTimers();
		vi.clearAllMocks();
		resetContentWindow();
		document.body.style.userSelect = BODY_LOCKED;
		window.box_on = false;
	});

	afterEach(() => {
		// release the one-shot click listeners (CLICK_SUPPRESS_TIMEOUT_MS only; bounce timers stay pending)
		vi.advanceTimersByTime(CLICK_SUPPRESS_TIMEOUT_MS);
		vi.useRealTimers();
	});

	describe("preventEscalation", () => {
		TestRunner.success([ { name: "should stop propagation and prevent the default action", input: undefined, expected: { stopped: 1, prevented: 1 } } ], undefined, () => {
			const { event, preventDefault, stopPropagation } = createEvent(true);

			preventEscalation(event);

			return { stopped: stopPropagation.mock.calls.length, prevented: preventDefault.mock.calls.length };
		});
	});

	describe("wheel", () => {
		TestRunner.success([ { name: "should flag the next pointer event to be ignored", input: undefined, expected: true } ], undefined, () => {
			wheel();

			return window.scroll_bug_ignore;
		}, { matcher: "toBe" });
	});

	describe("pointermove", () => {
		TestRunner.success(testData.moveCases, undefined, ({ trusted, allowed, scrollBugIgnore, timer }: MoveInput) => {
			vi.mocked(allowSelection).mockReturnValue(allowed);
			window.scroll_bug_ignore = scrollBugIgnore ?? false;
			window.timer = timer ?? 0;
			const { event, preventDefault } = createEvent(trusted);

			pointermove(event);

			return {
				prevented: preventDefault.mock.calls.length > 0,
				boxUpdates: vi.mocked(updateBox).mock.calls,
				stopped: wasStopped(),
				scrollBugIgnore: window.scroll_bug_ignore
			};
		});
	});

	describe("pointerout", () => {
		TestRunner.success(testData.outCases, undefined, ({ trusted, allowed }: MoveInput) => {
			vi.mocked(allowSelection).mockReturnValue(allowed);
			const { event, preventDefault } = createEvent(trusted);

			pointerout(event);

			return {
				prevented: preventDefault.mock.calls.length > 0,
				boxUpdates: vi.mocked(updateBox).mock.calls,
				stopped: wasStopped(),
				scrollBugIgnore: window.scroll_bug_ignore
			};
		});
	});

	describe("pointercancel", () => {
		TestRunner.success(testData.cancelCases, undefined, ({ trusted }: { trusted: boolean }) => {
			pointercancel(createEvent(trusted).event);

			// true = the page is still locked (nothing was stopped)
			return !wasStopped();
		}, { matcher: "toBe" });
	});

	describe("suppressNextClick", () => {
		TestRunner.success(testData.suppressCases, undefined, ({ events, elapsedMs }: ClickInput) => {
			suppressNextClick();
			if (elapsedMs !== null) {
				vi.advanceTimersByTime(elapsedMs);
			}

			return dispatchOnPage(events);
		});
	});

	describe("pointerup", () => {
		TestRunner.success(testData.upCases, undefined, ({ trusted, allowed, boxOn, timer }: UpInput) => {
			vi.mocked(allowSelection).mockReturnValue(allowed);
			window.box_on = boxOn;
			window.timer = timer ?? 0;
			const { event, preventDefault } = createEvent(trusted);

			pointerup(event);

			return {
				prevented: preventDefault.mock.calls.length > 0,
				timerSet: window.timer !== 0,
				stopped: wasStopped(),
				boxUpdates: vi.mocked(updateBox).mock.calls
			};
		});

		describe("after the bounce window", () => {
			TestRunner.success(testData.upFinishCases, undefined, ({ trusted, allowed, boxOn }: UpInput) => {
				vi.mocked(allowSelection).mockReturnValue(allowed);
				window.box_on = boxOn;

				pointerup(createEvent(trusted).event);
				vi.advanceTimersByTime(MOUSEUP_BOUNCE_TIMEOUT_MS);

				return { boxUpdates: vi.mocked(updateBox).mock.calls, stopped: wasStopped(), timerReset: window.timer === 0 };
			});
		});

		describe("click after release", () => {
			TestRunner.success(testData.upClickCases, undefined, ({ boxOn }: { boxOn: boolean }) => {
				vi.mocked(allowSelection).mockReturnValue(true);
				window.box_on = boxOn;

				pointerup(createEvent(true).event);

				return dispatchOnPage([ "click" ]).some((result) => result.prevented);
			}, { matcher: "toBe" });
		});

		describe("pointer capture", () => {
			TestRunner.success(testData.captureCases, undefined, ({ hasCapture, throws }: { hasCapture: boolean, throws: boolean }) => {
				const target = document.createElement("div");
				const releasePointerCapture = vi.fn(() => {
					if (throws) {
						throw new Error("InvalidPointerId");
					}
				});
				Object.assign(target, { hasPointerCapture: () => hasCapture, releasePointerCapture });

				pointerup(createEvent(true, target).event);

				return releasePointerCapture.mock.calls.length;
			}, { matcher: "toBe" });
		});
	});

	describe("Fixed defects", () => {
		// pointerup() handles the return value of detect(..., true) with a retry loop.
		// When the release point flips smart-select mode (an important link enters the box),
		// detect() retries and sends the links before stopping.
		it("should open the selected links even when smart selection toggles at the release point", () => {
			vi.mocked(allowSelection).mockReturnValue(true);
			window.box_on = true;
			window.smart_select = false;
			window.settings = { 0: { action: "tabs" } } as IntentionalAnyForValidation;
			window.box.x1 = 0;
			window.box.x2 = 100;
			window.box.y1 = 0;
			window.box.y2 = 100;
			window.links = [ { x1: 10, y1: 10, x2: 20, y2: 20, width: 10, height: 10, box: null, important: true, href: "https://a.example/", innerText: "A" } ] as IntentionalAnyForValidation;
			window.linkclump = document.createElement("div");

			pointerup(createEvent(true).event);
			vi.advanceTimersByTime(MOUSEUP_BOUNCE_TIMEOUT_MS);

			expect(browser.runtime.sendMessage).toHaveBeenCalledTimes(1);
		});
	});
});

/**
 * detect / scroll Tests
 *
 * Verifies the hit-testing loop (drag threshold, link highlight boxes, counting by unique URL, dispatching the
 * selected links on release, smart selection mode transitions) and the edge auto-scroll while dragging.
 * The matching and box geometry modules are mocked; they have their own tests.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link project/tests/shared/support/contentWindow.ts} - Content script window state
 * @see {@link project/tests/shared/types/validation.ts} - Standard type for validation tests
 */

import { describe, afterEach, beforeEach, vi } from "vitest";
import { browser } from "wxt/browser";
import { detect, scroll } from "@/entrypoints/content/selection/lifecycle";
import { allowSelection } from "@/entrypoints/content/matching/allowSelection";
import { updateBox } from "@/entrypoints/content/dom/selectionBox";
import { resetContentWindow } from "../../../shared/support/contentWindow";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

vi.mock("@/entrypoints/content/matching/allowSelection", () => ({ allowSelection: vi.fn() }));
vi.mock("@/entrypoints/content/dom/selectionBox", () => ({ updateBox: vi.fn(), getXY: vi.fn(() => ({ x: 0, y: 0 })) }));
vi.mock("@/entrypoints/content/touch/touchHold", () => ({ cancelTouchHold: vi.fn() }));

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface LinkSpec {
	readonly href: string;
	readonly x1: number;
	readonly y1: number;
	readonly x2: number;
	readonly y2: number;
	readonly important?: boolean;
	/** Pre-existing highlight box state (null = none yet). */
	readonly box?: "visible" | "hidden";
}

interface DetectInput {
	/** Selection box corners [x1, x2, y1, y2]. */
	readonly box: readonly [number, number, number, number];
	readonly boxOn: boolean;
	readonly smartSelect?: boolean;
	readonly links: readonly LinkSpec[];
	readonly open: boolean;
	readonly scrollId?: number;
}

interface ScrollInput {
	readonly allowed: boolean;
	/** Pointer Y relative to the viewport. */
	readonly viewportY: number;
	readonly scrollY: number;
	readonly innerHeight?: number;
}

const BIG_BOX = [ 0, 100, 0, 100 ] as const;
const INSIDE = { x1: 10, y1: 10, x2: 20, y2: 20 } as const;
const OUTSIDE = { x1: 500, y1: 500, x2: 520, y2: 520 } as const;
const SETTING = { action: "tabs", key: 0, mouse: 0, options: {} };

const testData = {
	thresholdCases: [
		{
			name: "should not start while the box is smaller than the drag threshold",
			input: { box: [ 0, 3, 0, 3 ], boxOn: false, links: [], open: false },
			expected: { result: true, boxOn: false, scrollTimer: false, mouse: [ 7, 8 ] }
		},
		{
			name: "should start the selection once the box passes the drag threshold",
			input: { box: [ 0, 50, 0, 2 ], boxOn: false, links: [], open: false },
			expected: { result: true, boxOn: true, scrollTimer: true, mouse: [ 7, 8 ] }
		},
		{
			name: "should not start twice when the selection is already active",
			input: { box: BIG_BOX, boxOn: true, links: [], open: false },
			expected: { result: true, boxOn: true, scrollTimer: true, mouse: [ 7, 8 ] }
		},
		{
			name: "should keep the existing auto-scroll interval",
			input: { box: BIG_BOX, boxOn: true, links: [], open: false, scrollId: 4242 },
			expected: { result: true, boxOn: true, scrollTimer: true, mouse: [ 7, 8 ] }
		}
	],
	hitCases: [
		{
			name: "should create a highlight box for a link inside the selection box and count it",
			input: { box: BIG_BOX, boxOn: true, links: [ { href: "https://a.example/", ...INSIDE } ], open: false },
			expected: { result: true, boxes: [ "created" ], count: "1", messages: [] }
		},
		{
			name: "should not highlight a link outside the selection box",
			input: { box: BIG_BOX, boxOn: true, links: [ { href: "https://a.example/", ...OUTSIDE } ], open: false },
			expected: { result: true, boxes: [ null ], count: "0", messages: [] }
		},
		{
			name: "should treat a link that only touches the box edge as selected",
			input: { box: BIG_BOX, boxOn: true, links: [ { href: "https://a.example/", x1: 100, y1: 100, x2: 120, y2: 120 } ], open: false },
			expected: { result: true, boxes: [ "created" ], count: "1", messages: [] }
		},
		{
			name: "should show a hidden highlight box again when its link is selected",
			input: { box: BIG_BOX, boxOn: true, links: [ { href: "https://a.example/", ...INSIDE, box: "hidden" } ], open: false },
			expected: { result: true, boxes: [ "visible" ], count: "1", messages: [] }
		},
		{
			name: "should hide the highlight box of a link that is no longer selected",
			input: { box: BIG_BOX, boxOn: true, links: [ { href: "https://a.example/", ...OUTSIDE, box: "visible" } ], open: false },
			expected: { result: true, boxes: [ "hidden" ], count: "0", messages: [] }
		},
		{
			name: "should count links that share a URL only once",
			input: { box: BIG_BOX, boxOn: true, links: [ { href: "https://a.example/", ...INSIDE }, { href: "https://a.example/", x1: 30, y1: 30, x2: 40, y2: 40 } ], open: false },
			expected: { result: true, boxes: [ "created", "created" ], count: "1", messages: [] }
		}
	],
	openCases: [
		{
			name: "should send every selected link to the background script on release",
			input: { box: BIG_BOX, boxOn: true, links: [ { href: "https://a.example/", ...INSIDE }, { href: "https://b.example/", x1: 30, y1: 30, x2: 40, y2: 40 }, { href: "https://c.example/", ...OUTSIDE } ], open: true },
			expected: { result: true, boxes: [ "created", "created", null ], count: "2", messages: [ { message: "activate", urls: [ { url: "https://a.example/", title: "link-https://a.example/" }, { url: "https://b.example/", title: "link-https://b.example/" } ], setting: SETTING } ] }
		},
		{
			name: "should keep duplicate URLs in the message (the background script de-duplicates when asked)",
			input: { box: BIG_BOX, boxOn: true, links: [ { href: "https://a.example/", ...INSIDE }, { href: "https://a.example/", x1: 30, y1: 30, x2: 40, y2: 40 } ], open: true },
			expected: { result: true, boxes: [ "created", "created" ], count: "1", messages: [ { message: "activate", urls: [ { url: "https://a.example/", title: "link-https://a.example/" }, { url: "https://a.example/", title: "link-https://a.example/" } ], setting: SETTING } ] }
		},
		{
			name: "should send nothing on release when no link is selected",
			input: { box: BIG_BOX, boxOn: true, links: [ { href: "https://a.example/", ...OUTSIDE } ], open: true },
			expected: { result: true, boxes: [ null ], count: "0", messages: [] }
		}
	],
	smartCases: [
		{
			name: "should switch to smart mode and ask for a retry when an important link enters the box",
			input: { box: BIG_BOX, boxOn: true, smartSelect: false, links: [ { href: "https://a.example/", ...INSIDE, important: true } ], open: false },
			expected: { result: false, smartSelect: true, boxes: [ null ], count: "", messages: [] }
		},
		{
			name: "should ignore ordinary links and count only important ones in smart mode",
			input: { box: BIG_BOX, boxOn: true, smartSelect: true, links: [ { href: "https://a.example/", ...INSIDE, important: true }, { href: "https://b.example/", x1: 30, y1: 30, x2: 40, y2: 40 } ], open: false },
			expected: { result: true, smartSelect: true, boxes: [ "created", null ], count: "1", messages: [] }
		},
		{
			name: "should leave smart mode and ask for a retry when the last important link leaves the box",
			input: { box: BIG_BOX, boxOn: true, smartSelect: true, links: [ { href: "https://a.example/", ...OUTSIDE, important: true } ], open: false },
			expected: { result: false, smartSelect: false, boxes: [ null ], count: "", messages: [] }
		}
	],
	scrollCases: [
		{ name: "should stop the interval when the selection is no longer allowed", input: { allowed: false, viewportY: 799, scrollY: 0 }, expected: { scrolls: [], mouseY: 799, boxUpdates: [], scrollBugIgnore: false, stopped: true } },
		{ name: "should scroll down fast when the pointer is at the very bottom edge", input: { allowed: true, viewportY: 799, scrollY: 0 }, expected: { scrolls: [ [ 0, 60 ] ], mouseY: 859, boxUpdates: [ [ 10, 859 ] ], scrollBugIgnore: true, stopped: false } },
		{ name: "should scroll down at medium speed near the bottom edge", input: { allowed: true, viewportY: 795, scrollY: 0 }, expected: { scrolls: [ [ 0, 30 ] ], mouseY: 825, boxUpdates: [ [ 10, 825 ] ], scrollBugIgnore: true, stopped: false } },
		{ name: "should scroll down slowly within 20px of the bottom edge", input: { allowed: true, viewportY: 785, scrollY: 0 }, expected: { scrolls: [ [ 0, 10 ] ], mouseY: 795, boxUpdates: [ [ 10, 795 ] ], scrollBugIgnore: true, stopped: false } },
		{ name: "should scroll up fast when the pointer is at the very top edge", input: { allowed: true, viewportY: 1, scrollY: 500 }, expected: { scrolls: [ [ 0, -60 ] ], mouseY: 441, boxUpdates: [ [ 10, 441 ] ], scrollBugIgnore: true, stopped: false } },
		{ name: "should scroll up at medium speed near the top edge", input: { allowed: true, viewportY: 5, scrollY: 500 }, expected: { scrolls: [ [ 0, -30 ] ], mouseY: 475, boxUpdates: [ [ 10, 475 ] ], scrollBugIgnore: true, stopped: false } },
		{ name: "should scroll up slowly within 20px of the top edge", input: { allowed: true, viewportY: 15, scrollY: 500 }, expected: { scrolls: [ [ 0, -10 ] ], mouseY: 505, boxUpdates: [ [ 10, 505 ] ], scrollBugIgnore: true, stopped: false } },
		{ name: "should not scroll up when the page is already at the top", input: { allowed: true, viewportY: 5, scrollY: 0 }, expected: { scrolls: [], mouseY: 5, boxUpdates: [], scrollBugIgnore: false, stopped: true } },
		{ name: "should stop the interval when the pointer is away from both edges", input: { allowed: true, viewportY: 400, scrollY: 500 }, expected: { scrolls: [], mouseY: 900, boxUpdates: [], scrollBugIgnore: false, stopped: true } },
		{ name: "should not scroll down at the exact 20px boundary", input: { allowed: true, viewportY: 780, scrollY: 0 }, expected: { scrolls: [], mouseY: 780, boxUpdates: [], scrollBugIgnore: false, stopped: true } }
	]
} as const satisfies Record<string, readonly TestCase[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

/**
 * Builds `window.links` from the specs, attaching existing highlight boxes where requested.
 *
 * @param {readonly LinkSpec[]} specs - Link descriptions.
 */
function buildLinks(specs: readonly LinkSpec[]): void {
	window.links = specs.map((spec) => {
		let box: HTMLElement | null = null;
		if (spec.box) {
			box = document.createElement("span");
			box.style.visibility = spec.box;
			window.linkclump.append(box);
		}

		return {
			...spec,
			width: spec.x2 - spec.x1,
			height: spec.y2 - spec.y1,
			box,
			important: spec.important ?? false,
			innerText: `link-${spec.href}`
		} as IntentionalAnyForValidation;
	});
}

/**
 * Describes the highlight box state of a link.
 *
 * @param {HTMLElement | null} box - The link's highlight box.
 * @returns "created" for a fresh box (no visibility set), its visibility otherwise, or null when there is none.
 */
function describeBox(box: HTMLElement | null): string | null {
	if (box === null) {
		return null;
	}

	return box.style.visibility || "created";
}

describe("detect and scroll", () => {
	beforeEach(() => {
		// Arrange: Idle window state with one action so that start() can run
		vi.useFakeTimers();
		vi.clearAllMocks();
		resetContentWindow();
		window.settings = { 0: SETTING } as IntentionalAnyForValidation;
		vi.mocked(allowSelection).mockReturnValue(true);
	});

	afterEach(() => {
		clearInterval(window.scroll_id);
		vi.useRealTimers();
	});

	/**
	 * Applies the case state to `window` and runs detect at (7, 8).
	 *
	 * @param {DetectInput} input - Case input.
	 * @returns The detect result and the observable state afterwards.
	 */
	const run = ({ box, boxOn, smartSelect, links, open, scrollId }: DetectInput) => {
		const [ x1, x2, y1, y2 ] = box;
		Object.assign(window.box, { x1, x2, y1, y2 });
		window.box_on = boxOn;
		window.smart_select = smartSelect ?? false;
		window.scroll_id = scrollId ?? 0;
		buildLinks(links);

		const result = detect(7, 8, open);

		return {
			result,
			boxOn: window.box_on,
			smartSelect: window.smart_select,
			scrollTimer: window.scroll_id !== 0,
			mouse: [ window.mouse_x, window.mouse_y ],
			boxes: window.links.map((link) => describeBox(link.box)),
			count: window.count_label.innerText ?? "",
			messages: vi.mocked(browser.runtime.sendMessage).mock.calls.map(([ message ]) => message)
		};
	};

	describe("detect (drag threshold and auto-scroll)", () => {
		TestRunner.success(testData.thresholdCases, undefined, (input: DetectInput) => {
			const { result, boxOn, scrollTimer, mouse } = run(input);

			return { result, boxOn, scrollTimer, mouse };
		});
	});

	describe("detect (hit testing)", () => {
		TestRunner.success(testData.hitCases, undefined, (input: DetectInput) => {
			const { result, boxes, count, messages } = run(input);

			return { result, boxes, count, messages };
		});
	});

	describe("detect (dispatching links on release)", () => {
		TestRunner.success(testData.openCases, undefined, (input: DetectInput) => {
			const { result, boxes, count, messages } = run(input);

			return { result, boxes, count, messages };
		});
	});

	describe("detect (smart selection)", () => {
		TestRunner.success(testData.smartCases, undefined, (input: DetectInput) => {
			const { result, smartSelect, boxes, count, messages } = run(input);

			return { result, smartSelect, boxes, count, messages };
		});
	});

	describe("scroll", () => {
		TestRunner.success(testData.scrollCases, undefined, ({ allowed, viewportY, scrollY, innerHeight }: ScrollInput) => {
			vi.mocked(allowSelection).mockReturnValue(allowed);
			Object.defineProperty(window, "scrollY", { configurable: true, value: scrollY });
			Object.defineProperty(window, "innerHeight", { configurable: true, value: innerHeight ?? 800 });
			const scrollBy = vi.spyOn(window, "scrollBy").mockImplementation(() => {});
			window.box_on = true;
			window.mouse_x = 10;
			window.mouse_y = scrollY + viewportY;
			window.scroll_id = setInterval(() => {}, 100) as unknown as number;

			scroll();

			return {
				scrolls: scrollBy.mock.calls,
				mouseY: window.mouse_y,
				boxUpdates: vi.mocked(updateBox).mock.calls,
				scrollBugIgnore: window.scroll_bug_ignore,
				stopped: window.scroll_id === 0
			};
		});
	});
});

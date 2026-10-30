/**
 * Selection control Tests
 *
 * Verifies the selection lifecycle functions: startSelection (matching, pointer capture, event suppression,
 * bounce renewal, listener registration), start (link collection with javascript:/empty/invisible/include/exclude
 * filters, invalid filter handling, smart selection flags), stop (listener removal, timers, Linux menu re-arming)
 * and cleanUp (box/link/state reset).
 * The matching, box geometry and touch hold modules are mocked; they have their own tests.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link project/tests/shared/support/contentWindow.ts} - Content script window state
 * @see {@link project/tests/shared/types/validation.ts} - Standard type for validation tests
 */

import { describe, afterEach, beforeEach, vi } from "vitest";
import { cleanUp, start, startSelection, stop } from "@/entrypoints/content/selection/lifecycle";
import { allowSelection } from "@/entrypoints/content/matching/allowSelection";
import { getXY, updateBox } from "@/entrypoints/content/dom/selectionBox";
import { cancelTouchHold } from "@/entrypoints/content/touch/touchHold";
import { OS_LINUX, OS_WIN } from "@/assets/js/constants/os";
import { MOUSE_BUTTON_LEFT, MOUSE_BUTTON_NONE, MOUSE_BUTTON_RIGHT } from "@/assets/js/constants/mouseButton";
import { KEY_CODE_CTRL, KEY_CODE_SHIFT } from "@/assets/js/constants/keyboard";
import { FILTER_EXCLUDE_LINKS, FILTER_INCLUDE_LINKS, SMART_SELECT_OFF, SMART_SELECT_ON } from "@/assets/js/constants/action";
import { resetContentWindow } from "../../../shared/support/contentWindow";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

vi.mock("@/entrypoints/content/matching/allowSelection", () => ({ allowSelection: vi.fn() }));
vi.mock("@/entrypoints/content/dom/selectionBox", () => ({ updateBox: vi.fn(), getXY: vi.fn() }));
vi.mock("@/entrypoints/content/touch/touchHold", () => ({ cancelTouchHold: vi.fn() }));

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface StartSelectionInput {
	readonly allowed: boolean;
	readonly os?: number;
	readonly mouseButton?: number;
	readonly touchActive?: boolean;
	/** Pending mouseup bounce timer. */
	readonly timer?: number;
	/** The selection was left stuck active by an earlier gesture. */
	readonly boxOn?: boolean;
	/** Pointer capture support of the event target. */
	readonly capture?: "works" | "throws" | "unsupported";
}

interface LinkSpec {
	readonly href: string;
	readonly text?: string;
	/** Parent element tag (headings mark links as "important" for smart selection). */
	readonly parent?: string;
	readonly display?: string;
	readonly visibility?: string;
	/** Adds an <img> child whose position/size extend the link box. */
	readonly image?: boolean;
}

interface StartInput {
	readonly links: readonly LinkSpec[];
	readonly options?: { readonly ignore?: readonly (number | string)[], readonly smart?: number };
	/** `window.setting`. When no action exists under this key the selection cannot start. */
	readonly setting?: number;
	readonly os?: number;
}

interface StopInput {
	readonly os: number;
	readonly actionKey: number;
	readonly keyPressed: number;
	readonly boxOn: boolean;
	readonly timer: boolean;
	readonly scrollTimer: boolean;
	readonly stopMenu: boolean;
}

interface CleanUpInput {
	readonly linksWithBox: number;
	readonly linksWithoutBox: number;
	readonly keyPressed: number;
	readonly missingBox?: boolean;
}

const SELECTION_LISTENERS = [ "pointermove", "pointerup", "pointercancel", "wheel", "mousewheel", "pointerout" ];
const NOTHING = { result: false, captures: 0, prevented: false, timerPending: false, stopMenu: false, listeners: [], anchor: [ 0, 0 ], boxUpdates: [], boxOn: false };

const testData = {
	startSelectionCases: [
		{ name: "should do nothing when no action matches", input: { allowed: false }, expected: NOTHING },
		{
			name: "should capture the pointer, anchor the box and register the selection listeners",
			input: { allowed: true, mouseButton: MOUSE_BUTTON_LEFT },
			expected: { result: true, captures: 1, prevented: true, timerPending: false, stopMenu: false, listeners: SELECTION_LISTENERS, anchor: [ 30, 40 ], boxUpdates: [ [ 30, 40 ] ], boxOn: false }
		},
		{
			name: "should not suppress the event for a right click on Windows (it breaks the spell checker)",
			input: { allowed: true, mouseButton: MOUSE_BUTTON_RIGHT, os: OS_WIN },
			expected: { result: true, captures: 1, prevented: false, timerPending: false, stopMenu: false, listeners: SELECTION_LISTENERS, anchor: [ 30, 40 ], boxUpdates: [ [ 30, 40 ] ], boxOn: false }
		},
		{
			name: "should suppress the event for a right click on Linux",
			input: { allowed: true, mouseButton: MOUSE_BUTTON_RIGHT, os: OS_LINUX },
			expected: { result: true, captures: 1, prevented: true, timerPending: false, stopMenu: false, listeners: SELECTION_LISTENERS, anchor: [ 30, 40 ], boxUpdates: [ [ 30, 40 ] ], boxOn: false }
		},
		{
			name: "should not suppress the event on the delayed touch path (pointerdown was already dispatched)",
			input: { allowed: true, mouseButton: MOUSE_BUTTON_LEFT, touchActive: true },
			expected: { result: true, captures: 1, prevented: false, timerPending: false, stopMenu: false, listeners: SELECTION_LISTENERS, anchor: [ 30, 40 ], boxUpdates: [ [ 30, 40 ] ], boxOn: false }
		},
		{
			name: "should only cancel the bounce timer and keep the menu suppressed when a bounce timer is pending",
			input: { allowed: true, mouseButton: MOUSE_BUTTON_LEFT, os: OS_WIN, timer: 5 },
			expected: { result: true, captures: 1, prevented: true, timerPending: false, stopMenu: true, listeners: [], anchor: [ 0, 0 ], boxUpdates: [], boxOn: false }
		},
		{
			name: "should leave the menu state to the key handlers on Linux when a bounce timer is pending",
			input: { allowed: true, mouseButton: MOUSE_BUTTON_LEFT, os: OS_LINUX, timer: 5 },
			expected: { result: true, captures: 1, prevented: true, timerPending: false, stopMenu: false, listeners: [], anchor: [ 0, 0 ], boxUpdates: [], boxOn: false }
		},
		{
			name: "should clean up a selection that was left stuck active before starting",
			input: { allowed: true, mouseButton: MOUSE_BUTTON_LEFT, boxOn: true },
			expected: { result: true, captures: 1, prevented: true, timerPending: false, stopMenu: false, listeners: SELECTION_LISTENERS, anchor: [ 30, 40 ], boxUpdates: [ [ 30, 40 ] ], boxOn: false }
		},
		{
			name: "should ignore errors from setPointerCapture",
			input: { allowed: true, mouseButton: MOUSE_BUTTON_LEFT, capture: "throws" },
			expected: { result: true, captures: 1, prevented: true, timerPending: false, stopMenu: false, listeners: SELECTION_LISTENERS, anchor: [ 30, 40 ], boxUpdates: [ [ 30, 40 ] ], boxOn: false }
		},
		{
			name: "should work when the target does not support pointer capture",
			input: { allowed: true, mouseButton: MOUSE_BUTTON_LEFT, capture: "unsupported" },
			expected: { result: true, captures: 0, prevented: true, timerPending: false, stopMenu: false, listeners: SELECTION_LISTENERS, anchor: [ 30, 40 ], boxUpdates: [ [ 30, 40 ] ], boxOn: false }
		}
	],
	startFilterCases: [
		{
			name: "should collect normal links and skip javascript:, empty and '#' links",
			input: { links: [ { href: "https://a.example/" }, { href: "javascript:void(0)" }, { href: "" }, { href: "#" }, { href: "https://b.example/" } ] },
			expected: { hrefs: [ "https://a.example/", "https://b.example/" ], important: [ false, false ] }
		},
		{
			name: "should skip links hidden with display:none or visibility:hidden",
			input: { links: [ { href: "https://a.example/" }, { href: "https://hidden1.example/", display: "none" }, { href: "https://hidden2.example/", visibility: "hidden" } ] },
			expected: { hrefs: [ "https://a.example/" ], important: [ false ] }
		},
		{
			name: "should exclude links matching the filter words (by href or text) in exclude mode",
			input: { links: [ { href: "https://a.example/" }, { href: "https://ads.example/" }, { href: "https://b.example/", text: "Sponsored link" } ], options: { ignore: [ FILTER_EXCLUDE_LINKS, "ads", "Sponsored" ] } },
			expected: { hrefs: [ "https://a.example/" ], important: [ false ] }
		},
		{
			name: "should keep only links matching the filter words in include mode",
			input: { links: [ { href: "https://a.example/" }, { href: "https://docs.example/" }, { href: "https://b.example/", text: "docs home" } ], options: { ignore: [ FILTER_INCLUDE_LINKS, "docs" ] } },
			expected: { hrefs: [ "https://docs.example/", "https://b.example/" ], important: [ false, false ] }
		},
		{
			name: "should not filter when only the mode value is present (no filter words)",
			input: { links: [ { href: "https://a.example/" } ], options: { ignore: [ FILTER_EXCLUDE_LINKS ] } },
			expected: { hrefs: [ "https://a.example/" ], important: [ false ] }
		},
		{
			name: "should select no links when the filter words are not a valid regular expression",
			input: { links: [ { href: "https://a.example/" } ], options: { ignore: [ FILTER_EXCLUDE_LINKS, "(unclosed" ] } },
			expected: { hrefs: [], important: [] }
		},
		{
			name: "should flag links inside headings as important when smart selection is on",
			input: { links: [ { href: "https://a.example/", parent: "h2" }, { href: "https://b.example/", parent: "div" }, { href: "https://c.example/", parent: "H3" } ], options: { smart: SMART_SELECT_ON } },
			expected: { hrefs: [ "https://a.example/", "https://b.example/", "https://c.example/" ], important: [ true, false, true ] }
		},
		{
			name: "should not flag links as important when smart selection is off",
			input: { links: [ { href: "https://a.example/", parent: "h2" } ], options: { smart: SMART_SELECT_OFF } },
			expected: { hrefs: [ "https://a.example/" ], important: [ false ] }
		}
	],
	startGeometryCases: [
		{
			name: "should record the link position and size",
			input: { links: [ { href: "https://a.example/" } ] },
			expected: { x1: 10, y1: 20, x2: 60, y2: 35, width: 50, height: 15 }
		},
		{
			name: "should extend the box to a taller, wider image placed higher than the link",
			input: { links: [ { href: "https://a.example/", image: true } ] },
			expected: { x1: 10, y1: 10, x2: 90, y2: 70, width: 80, height: 60 }
		}
	],
	startUnavailableCases: [
		{
			name: "should log an error and leave the page untouched when the selected action does not exist",
			input: { links: [ { href: "https://a.example/" } ], setting: 99 },
			expected: { boxOn: false, userSelect: "", errors: 1, links: 0 }
		}
	],
	startEffectCases: [
		{ name: "should lock text selection, show the box and counter and suppress the menu on Windows", input: { links: [], os: OS_WIN }, expected: { boxOn: true, userSelect: "none", boxVisibility: "visible", labelVisibility: "visible", stopMenu: true } },
		{ name: "should leave the menu suppression to the key handlers on Linux", input: { links: [], os: OS_LINUX }, expected: { boxOn: true, userSelect: "none", boxVisibility: "visible", labelVisibility: "visible", stopMenu: false } }
	],
	stopCases: [
		{
			name: "should unlock text selection, remove the listeners and clear timers",
			input: { os: OS_WIN, actionKey: 0, keyPressed: 0, boxOn: false, timer: true, scrollTimer: true, stopMenu: true },
			expected: { userSelect: "", removed: SELECTION_LISTENERS, timerCleared: true, timerFired: 0, scrollCleared: true, scrollFired: 0, touchHoldCancelled: true, stopMenu: true, boxOn: false }
		},
		{
			name: "should reset the selection state when the box was active",
			input: { os: OS_WIN, actionKey: 0, keyPressed: 0, boxOn: true, timer: false, scrollTimer: false, stopMenu: true },
			expected: { userSelect: "", removed: SELECTION_LISTENERS, timerCleared: true, timerFired: 0, scrollCleared: true, scrollFired: 0, touchHoldCancelled: true, stopMenu: true, boxOn: false }
		},
		{
			name: "should re-enable the native menu on Linux when the action key is no longer held",
			input: { os: OS_LINUX, actionKey: KEY_CODE_CTRL, keyPressed: 0, boxOn: false, timer: false, scrollTimer: false, stopMenu: true },
			expected: { userSelect: "", removed: SELECTION_LISTENERS, timerCleared: true, timerFired: 0, scrollCleared: true, scrollFired: 0, touchHoldCancelled: true, stopMenu: false, boxOn: false }
		},
		{
			name: "should keep the menu suppressed on Linux while the action key is still held",
			input: { os: OS_LINUX, actionKey: KEY_CODE_SHIFT, keyPressed: KEY_CODE_SHIFT, boxOn: false, timer: false, scrollTimer: false, stopMenu: true },
			expected: { userSelect: "", removed: SELECTION_LISTENERS, timerCleared: true, timerFired: 0, scrollCleared: true, scrollFired: 0, touchHoldCancelled: true, stopMenu: true, boxOn: false }
		}
	],
	cleanUpCases: [
		{
			name: "should hide the box and counter, remove link boxes and reset the selection state",
			input: { linksWithBox: 2, linksWithoutBox: 1, keyPressed: KEY_CODE_CTRL },
			expected: { borderWidth: "0px", visibility: "hidden", labelVisibility: "hidden", boxOn: false, links: 0, linkBoxesInDom: 0, smartSelect: false, mouseButton: MOUSE_BUTTON_NONE, pointerType: null, touchActive: false, keyPressed: KEY_CODE_CTRL, touchHoldCancelled: true }
		},
		{
			name: "should keep the pressed key so that a held non-modifier key arms the next selection",
			input: { linksWithBox: 0, linksWithoutBox: 0, keyPressed: 90 },
			expected: { borderWidth: "0px", visibility: "hidden", labelVisibility: "hidden", boxOn: false, links: 0, linkBoxesInDom: 0, smartSelect: false, mouseButton: MOUSE_BUTTON_NONE, pointerType: null, touchActive: false, keyPressed: 90, touchHoldCancelled: true }
		},
		{
			name: "should tolerate a missing box and counter label",
			input: { linksWithBox: 0, linksWithoutBox: 0, keyPressed: 0, missingBox: true },
			expected: { borderWidth: undefined, visibility: undefined, labelVisibility: undefined, boxOn: false, links: 0, linkBoxesInDom: 0, smartSelect: false, mouseButton: MOUSE_BUTTON_NONE, pointerType: null, touchActive: false, keyPressed: 0, touchHoldCancelled: true }
		}
	]
} as const satisfies Record<string, readonly TestCase[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

/**
 * Overrides a layout property (a prototype getter in JSDOM) on a single element.
 *
 * @param {object} target - Element to override.
 * @param {string} key - Property name.
 * @param {number} value - Value to return.
 */
function defineLayout(target: object, key: string, value: number): void {
	Object.defineProperty(target, key, { configurable: true, value });
}

/**
 * Builds the anchors described by the specs into the page.
 *
 * @param {readonly LinkSpec[]} specs - Link descriptions.
 */
function buildLinks(specs: readonly LinkSpec[]): void {
	for (const spec of specs) {
		const parent = document.createElement(spec.parent ?? "div");
		const anchor = document.createElement("a");
		anchor.setAttribute("href", spec.href);
		anchor.textContent = spec.text ?? "link";
		if (spec.display) {
			anchor.style.display = spec.display;
		}
		if (spec.visibility) {
			anchor.style.visibility = spec.visibility;
		}
		defineLayout(anchor, "offsetWidth", 50);
		defineLayout(anchor, "offsetHeight", 15);
		if (spec.image) {
			const image = document.createElement("img");
			defineLayout(image, "offsetWidth", 80);
			defineLayout(image, "offsetHeight", 60);
			anchor.append(image);
		}
		parent.append(anchor);
		document.body.append(parent);
	}
}

describe("selection control", () => {
	beforeEach(() => {
		// Arrange: Idle window state, fake timers, silenced console, and fixed link positions
		vi.useFakeTimers();
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
		resetContentWindow();
		window.settings = { 0: { action: "tabs", key: 0, mouse: 0, options: {} } } as IntentionalAnyForValidation;
		vi.mocked(getXY).mockImplementation((el) => (el.nodeName === "IMG" ? { x: 5, y: 10 } : { x: 10, y: 20 }));
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe("startSelection", () => {
		TestRunner.success(testData.startSelectionCases, undefined, ({ allowed, os, mouseButton, touchActive, timer, boxOn, capture }: StartSelectionInput) => {
			vi.mocked(allowSelection).mockReturnValue(allowed);
			window.os = (os ?? OS_WIN) as typeof window.os;
			window.mouse_button = mouseButton ?? MOUSE_BUTTON_LEFT;
			window.touch_active = touchActive ?? false;
			window.timer = timer ?? 0;
			window.box_on = boxOn ?? false;
			const addSpy = vi.spyOn(window, "addEventListener");
			const target = document.createElement("div");
			const setPointerCapture = vi.fn(() => {
				if (capture === "throws") {
					throw new Error("InvalidPointerId");
				}
			});
			if (capture !== "unsupported") {
				Object.assign(target, { setPointerCapture });
			}
			const preventDefault = vi.fn();
			const event = { target, pointerId: 1, preventDefault, stopPropagation: vi.fn() } as unknown as PointerEvent;

			const result = startSelection(event, 30, 40);

			return {
				result,
				captures: setPointerCapture.mock.calls.length,
				prevented: preventDefault.mock.calls.length > 0,
				timerPending: window.timer !== 0,
				stopMenu: window.stop_menu,
				listeners: addSpy.mock.calls.map(([ type ]) => type),
				anchor: [ window.box.x, window.box.y ],
				boxUpdates: vi.mocked(updateBox).mock.calls,
				boxOn: window.box_on
			};
		});
	});

	describe("start (link collection)", () => {
		TestRunner.success(testData.startFilterCases, undefined, ({ links, options }: StartInput) => {
			window.settings = { 0: { action: "tabs", key: 0, mouse: 0, options } } as IntentionalAnyForValidation;
			buildLinks(links);

			start();

			return { hrefs: window.links.map((link) => link.href), important: window.links.map((link) => link.important) };
		});
	});

	describe("start (link geometry)", () => {
		TestRunner.success(testData.startGeometryCases, undefined, ({ links }: StartInput) => {
			buildLinks(links);

			start();

			const link = window.links[0];

			return { x1: link?.x1, y1: link?.y1, x2: link?.x2, y2: link?.y2, width: link?.width, height: link?.height };
		});
	});

	describe("start (unavailable action)", () => {
		TestRunner.success(testData.startUnavailableCases, undefined, ({ links, setting }: StartInput) => {
			window.setting = setting ?? 0;
			buildLinks(links);

			start();

			return { boxOn: window.box_on, userSelect: document.body.style.userSelect, errors: vi.mocked(console.error).mock.calls.length, links: window.links.length };
		});
	});

	describe("start (side effects)", () => {
		TestRunner.success(testData.startEffectCases, undefined, ({ links, os }: StartInput) => {
			window.os = (os ?? OS_WIN) as typeof window.os;
			buildLinks(links);

			start();

			return {
				boxOn: window.box_on,
				userSelect: document.body.style.userSelect,
				boxVisibility: window.box.style.visibility,
				labelVisibility: window.count_label.style.visibility,
				stopMenu: window.stop_menu
			};
		});
	});

	describe("stop", () => {
		TestRunner.success(testData.stopCases, undefined, ({ os, actionKey, keyPressed, boxOn, timer, scrollTimer, stopMenu }: StopInput) => {
			window.os = os as typeof window.os;
			window.settings = { 0: { action: "tabs", key: actionKey, mouse: 0, options: {} } } as IntentionalAnyForValidation;
			window.key_pressed = keyPressed;
			window.box_on = boxOn;
			window.stop_menu = stopMenu;
			document.body.style.userSelect = "none";
			const timerFn = vi.fn();
			const scrollFn = vi.fn();
			window.timer = timer ? (setTimeout(timerFn, 100) as unknown as number) : 0;
			window.scroll_id = scrollTimer ? (setInterval(scrollFn, 100) as unknown as number) : 0;
			const removeSpy = vi.spyOn(window, "removeEventListener");

			stop();
			vi.advanceTimersByTime(1000);

			return {
				userSelect: document.body.style.userSelect,
				removed: removeSpy.mock.calls.map(([ type ]) => type),
				timerCleared: window.timer === 0,
				timerFired: timerFn.mock.calls.length,
				scrollCleared: window.scroll_id === 0,
				scrollFired: scrollFn.mock.calls.length,
				touchHoldCancelled: vi.mocked(cancelTouchHold).mock.calls.length > 0,
				stopMenu: window.stop_menu,
				boxOn: window.box_on
			};
		});
	});

	describe("cleanUp", () => {
		TestRunner.success(testData.cleanUpCases, undefined, ({ linksWithBox, linksWithoutBox, keyPressed, missingBox }: CleanUpInput) => {
			window.key_pressed = keyPressed;
			window.box_on = true;
			window.smart_select = true;
			window.mouse_button = MOUSE_BUTTON_LEFT;
			window.pointer_type = "touch";
			window.touch_active = true;
			window.box.style.borderWidth = "2px";
			window.box.style.visibility = "visible";
			window.count_label.style.visibility = "visible";
			for (let i = 0; i < linksWithBox; i++) {
				const box = document.createElement("span");
				window.linkclump.append(box);
				window.links.push({ box } as IntentionalAnyForValidation);
			}
			for (let i = 0; i < linksWithoutBox; i++) {
				window.links.push({ box: null } as IntentionalAnyForValidation);
			}
			const box = window.box;
			const label = window.count_label;
			if (missingBox) {
				window.box = undefined as IntentionalAnyForValidation;
				window.count_label = undefined as IntentionalAnyForValidation;
			}

			cleanUp();

			return {
				borderWidth: missingBox ? undefined : box.style.borderWidth,
				visibility: missingBox ? undefined : box.style.visibility,
				labelVisibility: missingBox ? undefined : label.style.visibility,
				boxOn: window.box_on,
				links: window.links.length,
				linkBoxesInDom: window.linkclump.children.length,
				smartSelect: window.smart_select,
				mouseButton: window.mouse_button,
				pointerType: window.pointer_type,
				touchActive: window.touch_active,
				keyPressed: window.key_pressed,
				touchHoldCancelled: vi.mocked(cancelTouchHold).mock.calls.length > 0
			};
		});
	});
});

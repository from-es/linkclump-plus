/**
 * selectionBox Tests
 *
 * Verifies creation of the selection box and counter label, page dimension measurement, box resizing/clamping,
 * and absolute position calculation (offsetParent chain, CSS transforms, scrolled ancestors).
 * JSDOM performs no layout, so layout values (offset*, scroll*, client*) are injected per case.
 *
 * Standard `it` block is used for the fixed defect verification section instead of `TestRunner` on purpose:
 * it verifies direct CSS style property assignment on a freshly created DOM element.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link project/tests/shared/types/validation.ts} - Standard type for validation tests
 */

import { describe, it, afterEach, beforeEach, expect, vi } from "vitest";
import {
	createBox,
	createCountLabel,
	createCustomElement,
	getXY,
	updateBox,
	updateDocumentDimensions
} from "@/entrypoints/content/dom/selectionBox";
import { Z_INDEX_BASE } from "@/assets/js/constants/ui";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface DimensionsInput {
	readonly clientWidth: number;
	readonly clientHeight: number;
	readonly bodyScrollWidth: number;
	readonly bodyScrollHeight: number;
	readonly docScrollWidth: number;
	readonly docScrollHeight: number;
	readonly bodyOffsetWidth: number;
	readonly bodyOffsetHeight: number;
	readonly innerWidth: number;
	readonly bodyClientWidth: number;
}

interface UpdateBoxInput {
	/** Anchor corner (`window.box.x` / `window.box.y`). */
	readonly anchor: { readonly x: number, readonly y: number };
	/** Pointer position passed to updateBox. */
	readonly pointer: { readonly x: number, readonly y: number };
	/** Page size and scrollbar: width/height = scroll size, scrollbar = innerWidth - body.clientWidth. */
	readonly page: { readonly width: number, readonly height: number, readonly scrollbar: number };
	/** Layout size of the counter label. */
	readonly label: { readonly width: number, readonly height: number };
}

/** One element in an offsetParent chain; the first node is the measured element, the last is the outermost. */
interface Node {
	readonly offsetLeft: number;
	readonly offsetTop: number;
	readonly transform?: string;
	readonly scrollLeft?: number;
	readonly scrollTop?: number;
}

interface XYInput {
	readonly nodes: readonly Node[];
	/** How DOMMatrix behaves: normal parsing, or throwing (older browsers). */
	readonly matrix?: "parse" | "throw";
	/** Whether the legacy WebKitCSSMatrix exists (used when DOMMatrix throws). */
	readonly webkitMatrix?: boolean;
}

const DEFAULT_PAGE = { width: 1000, height: 2000, scrollbar: 0 } as const;
const NO_LABEL = { width: 0, height: 0 } as const;

const testData = {
	customElementCases: [
		{ name: "should create an element with the given tag name", input: "x-linkclump", expected: "X-LINKCLUMP" },
		{ name: "should create a standard element", input: "div", expected: "DIV" }
	],
	customElementErrorCases: [
		{ name: "should throw a TypeError for an empty tag name", input: "", expected: TypeError },
		{ name: "should throw a TypeError for a non-string tag name", input: 123 as IntentionalAnyForValidation, expected: TypeError },
		{ name: "should throw a TypeError for undefined", input: undefined as IntentionalAnyForValidation, expected: TypeError }
	],
	boxCases: [
		{
			name: "should create a hidden, absolutely positioned, non-interactive box using the selected action color",
			input: { settings: { 101: { color: "#ff0000" } }, setting: 101 },
			expected: {
				tag: "SPAN", border: "0px dotted rgb(255, 0, 0)", position: "absolute", zIndex: String(Z_INDEX_BASE - 1), visibility: "hidden",
				pointerEvents: "none", touchAction: "none", margin: "0px auto", coordinates: [ 0, 0, 0, 0, 0, 0 ]
			}
		},
		{
			name: "should fall back to a red border when the selected action has no color",
			input: { settings: { 101: {} }, setting: 101 },
			expected: {
				tag: "SPAN", border: "0px dotted red", position: "absolute", zIndex: String(Z_INDEX_BASE - 1), visibility: "hidden",
				pointerEvents: "none", touchAction: "none", margin: "0px auto", coordinates: [ 0, 0, 0, 0, 0, 0 ]
			}
		},
		{
			name: "should fall back to a red border when the selected action does not exist",
			input: { settings: {}, setting: 999 },
			expected: {
				tag: "SPAN", border: "0px dotted red", position: "absolute", zIndex: String(Z_INDEX_BASE - 1), visibility: "hidden",
				pointerEvents: "none", touchAction: "none", margin: "0px auto", coordinates: [ 0, 0, 0, 0, 0, 0 ]
			}
		}
	],
	countLabelCases: [
		{
			name: "should create a hidden inline-block counter with the default font size and weight",
			input: undefined,
			expected: {
				tag: "SPAN", zIndex: String(Z_INDEX_BASE), display: "inline-block", visibility: "hidden", pointerEvents: "none", userSelect: "none",
				position: "absolute", top: "0px", left: "0px", fontSize: "16px", lineHeight: "16px", fontWeight: "400",
				color: "black", backgroundColor: "transparent", padding: "8px", borderRadius: "8px"
			}
		}
	],
	dimensionCases: [
		{
			name: "should use the largest of the client, scroll and offset sizes",
			input: { clientWidth: 800, clientHeight: 600, bodyScrollWidth: 900, bodyScrollHeight: 3000, docScrollWidth: 1200, docScrollHeight: 2500, bodyOffsetWidth: 700, bodyOffsetHeight: 700, innerWidth: 1000, bodyClientWidth: 985 },
			expected: { width: 1200, height: 3000, scrollbarWidth: 15 }
		},
		{
			name: "should report a zero scrollbar width when the page has no vertical scrollbar",
			input: { clientWidth: 800, clientHeight: 600, bodyScrollWidth: 0, bodyScrollHeight: 0, docScrollWidth: 0, docScrollHeight: 0, bodyOffsetWidth: 0, bodyOffsetHeight: 0, innerWidth: 800, bodyClientWidth: 800 },
			expected: { width: 800, height: 600, scrollbarWidth: 0 }
		}
	],
	updateBoxCases: [
		{
			name: "should extend the box to the bottom-right of the anchor",
			input: { anchor: { x: 100, y: 100 }, pointer: { x: 300, y: 250 }, page: DEFAULT_PAGE, label: NO_LABEL },
			expected: { x1: 100, x2: 300, y1: 100, y2: 250, left: "100px", top: "100px", width: "200px", height: "150px", labelTop: "250px", labelLeft: "300px" }
		},
		{
			name: "should extend the box to the top-left of the anchor",
			input: { anchor: { x: 300, y: 250 }, pointer: { x: 100, y: 100 }, page: DEFAULT_PAGE, label: NO_LABEL },
			expected: { x1: 100, x2: 300, y1: 100, y2: 250, left: "100px", top: "100px", width: "200px", height: "150px", labelTop: "100px", labelLeft: "100px" }
		},
		{
			name: "should handle a pointer to the top-right of the anchor",
			input: { anchor: { x: 100, y: 250 }, pointer: { x: 300, y: 100 }, page: DEFAULT_PAGE, label: NO_LABEL },
			expected: { x1: 100, x2: 300, y1: 100, y2: 250, left: "100px", top: "100px", width: "200px", height: "150px", labelTop: "100px", labelLeft: "300px" }
		},
		{
			name: "should produce an empty box when the pointer is on the anchor",
			input: { anchor: { x: 50, y: 50 }, pointer: { x: 50, y: 50 }, page: DEFAULT_PAGE, label: NO_LABEL },
			expected: { x1: 50, x2: 50, y1: 50, y2: 50, left: "50px", top: "50px", width: "0px", height: "0px", labelTop: "50px", labelLeft: "50px" }
		},
		{
			name: "should clamp the box to the page size minus the scrollbar width",
			input: { anchor: { x: 100, y: 100 }, pointer: { x: 5000, y: 9000 }, page: { width: 1000, height: 2000, scrollbar: 15 }, label: NO_LABEL },
			expected: { x1: 100, x2: 985, y1: 100, y2: 1985, left: "100px", top: "100px", width: "885px", height: "1885px", labelTop: "1985px", labelLeft: "985px" }
		},
		{
			name: "should place the counter label up and to the left of the pointer by its own size",
			input: { anchor: { x: 100, y: 100 }, pointer: { x: 300, y: 250 }, page: DEFAULT_PAGE, label: { width: 40, height: 20 } },
			expected: { x1: 100, x2: 300, y1: 100, y2: 250, left: "100px", top: "100px", width: "200px", height: "150px", labelTop: "225px", labelLeft: "255px" }
		}
	],
	xyCases: [
		{ name: "should return the offset of a single element", input: { nodes: [ { offsetLeft: 10, offsetTop: 20 } ] }, expected: { x: 10, y: 20 } },
		{ name: "should sum offsets along the offsetParent chain", input: { nodes: [ { offsetLeft: 10, offsetTop: 20 }, { offsetLeft: 100, offsetTop: 200 }, { offsetLeft: 1000, offsetTop: 2000 } ] }, expected: { x: 1110, y: 2220 } },
		{
			name: "should add a CSS translate transform of an ancestor",
			input: { nodes: [ { offsetLeft: 10, offsetTop: 20 }, { offsetLeft: 100, offsetTop: 200, transform: "matrix(1, 0, 0, 1, 7, 9)" } ] },
			expected: { x: 117, y: 229 }
		},
		{
			name: "should ignore a 'none' transform",
			input: { nodes: [ { offsetLeft: 10, offsetTop: 20, transform: "none" } ] },
			expected: { x: 10, y: 20 }
		},
		{
			name: "should ignore the transform when DOMMatrix throws and no legacy matrix exists",
			input: { nodes: [ { offsetLeft: 10, offsetTop: 20, transform: "matrix(1, 0, 0, 1, 7, 9)" } ], matrix: "throw", webkitMatrix: false },
			expected: { x: 10, y: 20 }
		},
		{
			name: "should fall back to WebKitCSSMatrix when DOMMatrix throws",
			input: { nodes: [ { offsetLeft: 10, offsetTop: 20, transform: "matrix(1, 0, 0, 1, 7, 9)" } ], matrix: "throw", webkitMatrix: true },
			expected: { x: 17, y: 29 }
		},
		{
			name: "should subtract the scroll offset of a scrollable ancestor",
			input: { nodes: [ { offsetLeft: 10, offsetTop: 20 }, { offsetLeft: 100, offsetTop: 200, scrollLeft: 30, scrollTop: 40 } ] },
			expected: { x: 80, y: 180 }
		},
		{
			name: "should not subtract the element's own scroll offset",
			input: { nodes: [ { offsetLeft: 10, offsetTop: 20, scrollLeft: 50, scrollTop: 60 } ] },
			expected: { x: 10, y: 20 }
		},
		{
			name: "should subtract the scroll offsets of every scrollable ancestor",
			input: { nodes: [ { offsetLeft: 0, offsetTop: 0 }, { offsetLeft: 0, offsetTop: 0, scrollTop: 10 }, { offsetLeft: 0, offsetTop: 0, scrollTop: 5, scrollLeft: 3 } ] },
			expected: { x: -3, y: -15 }
		}
	]
} as const satisfies Record<string, readonly TestCase[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

/**
 * Overrides a layout property (a prototype getter in JSDOM) on a single element.
 *
 * @param {object} target - Element (or document element) to override.
 * @param {string} key - Property name.
 * @param {unknown} value - Value to return.
 */
function defineLayout(target: object, key: string, value: unknown): void {
	Object.defineProperty(target, key, { configurable: true, value });
}

describe("selectionBox", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
		for (const key of [ "clientWidth", "clientHeight", "scrollWidth", "scrollHeight", "offsetWidth", "offsetHeight" ]) {
			Reflect.deleteProperty(document.documentElement, key);
			Reflect.deleteProperty(document.body, key);
		}
		Reflect.deleteProperty(window, "innerWidth");
		document.body.innerHTML = "";
	});

	describe("createCustomElement", () => {
		describe("Success cases", () => {
			TestRunner.success(testData.customElementCases, undefined, (tagName: string) => createCustomElement(tagName).tagName, { matcher: "toBe" });
		});

		describe("Error handling", () => {
			TestRunner.error(testData.customElementErrorCases, undefined, (tagName: string) => createCustomElement(tagName));
		});
	});

	describe("createBox", () => {
		TestRunner.success(testData.boxCases, undefined, ({ settings, setting }: { settings: object, setting: number }) => {
			window.settings = settings as IntentionalAnyForValidation;
			window.setting = setting;

			const box = createBox();

			return {
				tag: box.tagName,
				border: box.style.border,
				position: box.style.position,
				zIndex: box.style.zIndex,
				visibility: box.style.visibility,
				pointerEvents: box.style.pointerEvents,
				touchAction: box.style.touchAction,
				margin: box.style.margin,
				coordinates: [ box.x, box.y, box.x1, box.x2, box.y1, box.y2 ],
				isWindowBox: window.box === box
			};
		}, { matcher: "toMatchObject" });
	});

	describe("createCountLabel", () => {
		TestRunner.success(testData.countLabelCases, undefined, () => {
			const label = createCountLabel();
			const style = label.style;

			return {
				tag: label.tagName,
				zIndex: style.zIndex,
				display: style.display,
				visibility: style.visibility,
				pointerEvents: style.pointerEvents,
				userSelect: style.userSelect,
				position: style.position,
				top: style.top,
				left: style.left,
				fontSize: style.fontSize,
				lineHeight: style.lineHeight,
				fontWeight: style.fontWeight,
				color: style.color,
				backgroundColor: style.backgroundColor,
				padding: style.padding,
				borderRadius: style.borderRadius
			};
		}, { matcher: "toMatchObject" });
	});

	describe("updateDocumentDimensions", () => {
		TestRunner.success(testData.dimensionCases, undefined, (input: DimensionsInput) => {
			defineLayout(document.documentElement, "clientWidth", input.clientWidth);
			defineLayout(document.documentElement, "clientHeight", input.clientHeight);
			defineLayout(document.documentElement, "scrollWidth", input.docScrollWidth);
			defineLayout(document.documentElement, "scrollHeight", input.docScrollHeight);
			defineLayout(document.body, "scrollWidth", input.bodyScrollWidth);
			defineLayout(document.body, "scrollHeight", input.bodyScrollHeight);
			defineLayout(document.body, "offsetWidth", input.bodyOffsetWidth);
			defineLayout(document.body, "offsetHeight", input.bodyOffsetHeight);
			defineLayout(document.body, "clientWidth", input.bodyClientWidth);
			defineLayout(window, "innerWidth", input.innerWidth);

			return updateDocumentDimensions();
		});
	});

	describe("updateBox", () => {
		TestRunner.success(testData.updateBoxCases, undefined, ({ anchor, pointer, page, label }: UpdateBoxInput) => {
			window.settings = {} as IntentionalAnyForValidation;
			createBox();
			createCountLabel();
			window.box.x = anchor.x;
			window.box.y = anchor.y;
			defineLayout(window.count_label, "offsetWidth", label.width);
			defineLayout(window.count_label, "offsetHeight", label.height);
			defineLayout(document.documentElement, "clientWidth", page.width);
			defineLayout(document.documentElement, "clientHeight", page.height);
			defineLayout(document.body, "clientWidth", 1000 - page.scrollbar);
			defineLayout(window, "innerWidth", 1000);

			updateBox(pointer.x, pointer.y);

			return {
				x1: window.box.x1,
				x2: window.box.x2,
				y1: window.box.y1,
				y2: window.box.y2,
				left: window.box.style.left,
				top: window.box.style.top,
				width: window.box.style.width,
				height: window.box.style.height,
				labelTop: window.count_label.style.top,
				labelLeft: window.count_label.style.left
			};
		});
	});

	describe("getXY", () => {
		TestRunner.success(testData.xyCases, undefined, ({ nodes, matrix, webkitMatrix }: XYInput) => {
			// Arrange: Build the element chain (nodes[0] is the innermost) and inject layout values
			const elements = nodes.map(() => document.createElement("div"));
			const transforms = new Map<Element, string>();
			elements.forEach((el, i) => {
				const node = nodes[i];
				if (!node) {
					return;
				}
				defineLayout(el, "offsetLeft", node.offsetLeft);
				defineLayout(el, "offsetTop", node.offsetTop);
				defineLayout(el, "offsetParent", elements[i + 1] ?? null);
				defineLayout(el, "scrollLeft", node.scrollLeft ?? 0);
				defineLayout(el, "scrollTop", node.scrollTop ?? 0);
				if (node.transform) {
					transforms.set(el, node.transform);
				}
				(elements[i + 1] ?? document.body).append(el);
			});
			vi.spyOn(window, "getComputedStyle").mockImplementation((el) => ({ transform: transforms.get(el) ?? "none", webkitTransform: transforms.get(el) ?? "" }) as CSSStyleDeclaration);

			const parse = (value: string) => {
				const [ , tx, ty ] = /matrix\(1, 0, 0, 1, (-?\d+), (-?\d+)\)/.exec(value) ?? [];

				return { m41: Number(tx), m42: Number(ty) };
			};
			vi.stubGlobal("DOMMatrix", class {
				constructor(value: string) {
					if (matrix === "throw") {
						throw new Error("DOMMatrix unsupported");
					}
					Object.assign(this, parse(value));
				}
			});
			if (webkitMatrix) {
				vi.stubGlobal("WebKitCSSMatrix", class {
					constructor(value: string) {
						Object.assign(this, parse(value));
					}
				});
			}

			const target = elements[0];
			if (!target) {
				throw new Error("A case needs at least one node");
			}

			return getXY(target);
		});
	});

	describe("Fixed defects", () => {
		// createCountLabel() sets `fontFamily` so that Arial font family is applied.
		it("should apply the Arial font family to the counter label", () => {
			const label = createCountLabel();

			expect(label.style.fontFamily).toContain("Arial");
		});
	});
});

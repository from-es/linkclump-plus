import {
	Z_INDEX_BASE,
	COUNTER_FONT_SIZE_DEFAULT,
	COUNTER_FONT_WEIGHT_DEFAULT
} from "@/assets/js/constants/ui";

/**
 * Creates a custom element with the given tag name and optional `is` option,
 * throwing an error if the tag name is invalid. This is a wrapper around `document.createElement`
 * that validates the tag name before creation.
 *
 * @param {string} tagName - The tag name of the custom element to create.
 * @param {ElementCreationOptions} [options] - { is: "Custom Element Tag Name" }
 * @returns {HTMLElement} The created custom element.
 */
export function createCustomElement(tagName: string, options?: ElementCreationOptions): HTMLElement {
	if (!tagName || typeof tagName !== "string") {
		throw (`Error, Invalid value passed to createCustomElement(tagName). tagName >> ${tagName}`);
	}

	const custom = document.createElement(tagName, options);

	return custom;
}

/**
 * Creates the dotted selection rectangle element, styles it with the currently selected
 * action's color, and stores it on `window.box` along with its initial coordinate fields
 * (x/y/x1/x2/y1/y2), which updateBox() later maintains as the drag progresses.
 *
 * @see {@link ../types/window.d.ts|Window["box"]} for the `window.box` type custom definition.
 *
 * @returns {Window["box"]} The created box element (also assigned to `window.box`).
 */
export function createBox(): Window["box"] {
	// @ts-expect-error -- all will be right at the end of the function
	window.box = document.createElement("span");
	window.box.style.margin = "0px auto";
	window.box.style.border = "0px dotted " + (window.settings[window.setting]?.color ?? "red");
	window.box.style.position = "absolute";
	window.box.style.zIndex = (Z_INDEX_BASE - 1).toString();
	window.box.style.visibility = "hidden";
	window.box.style.pointerEvents = "none";
	window.box.style.touchAction = "none";

	// set the box properties
	window.box.x = 0;
	window.box.y = 0;
	window.box.x1 = 0;
	window.box.x2 = 0;
	window.box.y1 = 0;
	window.box.y2 = 0;

	return window.box;
}

/**
 * Creates the small counter label that shows the number of links currently inside the
 * selection box, styles it with the default font size/weight, and stores it on
 * `window.count_label`.
 *
 * @returns {HTMLElement} The created counter label element (also assigned to `window.count_label`).
 */
export function createCountLabel(): HTMLElement {
	const base = COUNTER_FONT_SIZE_DEFAULT;

	window.count_label = document.createElement("span");

	window.count_label.style.zIndex = Z_INDEX_BASE.toString();
	window.count_label.style.display = "inline-block";
	window.count_label.style.visibility = "hidden";
	window.count_label.style.pointerEvents = "none";
	window.count_label.style.touchAction = "none";
	window.count_label.style.userSelect = "none";

	window.count_label.style.position = "absolute";
	window.count_label.style.top = "0";
	window.count_label.style.left = "0";

	window.count_label.style.lineHeight = `${base * 1}px`;
	window.count_label.style.fontSize = `${base * 1}px`;
	window.count_label.style.font = "Arial, sans-serif";
	window.count_label.style.fontWeight = COUNTER_FONT_WEIGHT_DEFAULT.toString();

	window.count_label.style.color = "black";
	window.count_label.style.backgroundColor = "transparent";

	window.count_label.style.padding = `${base * 0.50}px`;
	window.count_label.style.borderRadius = `${base * 0.50}px`;
	window.count_label.style.border = `${base * 0.25}px double transparent`;

	return window.count_label;
}

/**
 * Measures the full scrollable size of the current page (not just the viewport) and the
 * width of the vertical scrollbar, so that updateBox() can clamp the selection box to the
 * page's actual bounds instead of letting it extend past the content or under the scrollbar.
 *
 * @returns {{ width: number, height: number, scrollbarWidth: number }} The page's full
 *   scrollable width/height and the scrollbar width, all in pixels.
 */
export function updateDocumentDimensions(): { width: number; height: number; scrollbarWidth: number; } {
	const width = Math.max(document.documentElement.clientWidth, document.body.scrollWidth, document.documentElement.scrollWidth, document.body.offsetWidth, document.documentElement.offsetWidth);
	const height = Math.max(document.documentElement.clientHeight, document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight);
	const scrollbarWidth = window.innerWidth - document.body.clientWidth;

	return { width, height, scrollbarWidth };
}

/**
 * Resizes and repositions the selection box (`window.box`) and the counter label
 * (`window.count_label`) to follow the pointer at (x, y), clamping the position to the
 * page's scrollable bounds so the box never extends past the document or under the
 * scrollbar. The anchor corner (`window.box.x`/`window.box.y`, set by createBox()/
 * startSelection()) stays fixed while the opposite corner tracks the pointer.
 *
 * @param {number} x - The pointer's current page X coordinate.
 * @param {number} y - The pointer's current page Y coordinate.
 * @returns {void}
 */
export function updateBox(x: number, y: number): void {
	const documentDimensions = updateDocumentDimensions();

	x = Math.min(x, documentDimensions.width  - documentDimensions.scrollbarWidth);
	y = Math.min(y, documentDimensions.height - documentDimensions.scrollbarWidth);

	if (x > window.box.x) {
		window.box.x1 = window.box.x;
		window.box.x2 = x;
	} else {
		window.box.x1 = x;
		window.box.x2 = window.box.x;
	}
	if (y > window.box.y) {
		window.box.y1 = window.box.y;
		window.box.y2 = y;
	} else {
		window.box.y1 = y;
		window.box.y2 = window.box.y;
	}

	window.box.style.left = window.box.x1 + "px";
	window.box.style.width = window.box.x2 - window.box.x1 + "px";
	window.box.style.top = window.box.y1 + "px";
	window.box.style.height = window.box.y2 - window.box.y1 + "px";

	const adjustPositionTop = window.count_label.offsetHeight + window.count_label.offsetHeight * 0.25;
	const adjustPositionLeft = window.count_label.offsetWidth + window.count_label.offsetHeight * 0.25;
	window.count_label.style.top = (y - adjustPositionTop) + "px";
	window.count_label.style.left = (x - adjustPositionLeft) + "px";
}

/**
 * Computes an element's absolute position on the page, walking up the offsetParent chain
 * (accounting for any CSS `transform` applied to an ancestor) and then subtracting the
 * scroll offset of any scrollable ancestor between the element and `document.body`. This
 * is needed because `offsetLeft`/`offsetTop` alone ignore both transforms and nested
 * scroll containers, which would otherwise throw off link detection on pages that use them.
 *
 * @param {HTMLElement} element - The element to locate.
 * @returns {{ x: number, y: number }} The element's absolute page coordinates in pixels.
 */
export function getXY(element: HTMLElement): { x: number, y: number } {
	let x = 0;
	let y = 0;

	let parent: Element | null = element;
	let matrix;

	do {
		if (parent instanceof HTMLElement) {
			const style = window.getComputedStyle(parent);
			const transform = style?.transform;

			if (transform && transform !== "none") {
				try {
					matrix = new DOMMatrix(transform);
				} catch {
					// Fallback, older browsers supported (Google Chrome 60 and earlier)
					if ("WebKitCSSMatrix" in window) {
						matrix = new WebKitCSSMatrix(style.webkitTransform);
					} else {
						matrix = { m41: 0, m42: 0 };
					}
				}
			} else {
				matrix = { m41: 0, m42: 0 };
			}

			x += parent.offsetLeft + matrix.m41;
			y += parent.offsetTop + matrix.m42;

			parent = parent.offsetParent;
		} else {
			break;
		}
	} while (parent);

	let scrollParent: Element | null = element;
	while (scrollParent && scrollParent !== document.body) {
		if (scrollParent.scrollLeft) {
			x -= scrollParent.scrollLeft;
		}
		if (scrollParent.scrollTop) {
			y -= scrollParent.scrollTop;
		}
		scrollParent = scrollParent.parentElement;
	}

	return {
		x: x,
		y: y
	};
}

// WXT provided cross-browser compatible API.
import { browser } from "wxt/browser";

import {
	OS_LINUX,
	OS_MAC
} from "@/assets/js/constants/os";
import {
	MOUSE_BUTTON_LEFT,
	MOUSE_BUTTON_RIGHT,
	MOUSE_BUTTON_NONE
} from "@/assets/js/constants/mouseButton";
import {
	KEY_CODE_NONE,
	KEY_CODE_SHIFT,
	KEY_CODE_CTRL,
	KEY_CODE_ALT,
	KEY_CODE_META,
	KEY_CODE_META_RIGHT,
	KEY_CODE_META_FIREFOX_MAC,
	KEY_CODE_END,
	KEY_CODE_HOME
} from "@/assets/js/constants/keyboard";
import {
	MOUSEUP_BOUNCE_TIMEOUT_MS,
	SCROLL_DETECT_INTERVAL_MS,
	TOUCH_HOLD_TIMEOUT_MS
} from "@/assets/js/constants/timing";
import {
	Z_INDEX_BASE,
	COUNTER_FONT_SIZE_DEFAULT,
	COUNTER_FONT_SIZE_MIN,
	COUNTER_FONT_SIZE_MAX,
	COUNTER_FONT_WEIGHT_DEFAULT,
	COUNTER_FONT_WEIGHT_MIN,
	COUNTER_FONT_WEIGHT_MAX,
	CUSTOM_TAG_LINKCLUMP,
	DRAG_THRESHOLD_MIN_PX
} from "@/assets/js/constants/ui";
import {
	SMART_SELECT_ON,
	FILTER_EXCLUDE_LINKS,
	FILTER_INCLUDE_LINKS
} from "@/assets/js/constants/action";
import { detectOs } from "@/assets/js/lib/detectOs";

import type { LinkItem } from "@/assets/js/types/Content";
import type { OsType } from "@/assets/js/types/OS";
import type { ActionSetting } from "@/assets/js/types/Settings";
import type {
	ActivateMessage,
	InitMessage,
	InitResponse
} from "@/assets/js/types/Messages";


// Cancels the touch hold that is currently pending (timer + temporary listeners), if any
let cancelPendingTouchHold: (() => void) | null = null;

// set all the properties of the window object
// to avoid typescript errors
declare global {
	interface Window {
		settings: Record<string, ActionSetting>;
		setting: number;

		key_pressed: number;
		mouse_button: number | null;
		stop_menu: boolean;
		box_on: boolean;
		smart_select: boolean;

		mouse_x: number;
		mouse_y: number;

		scroll_id: number;
		links: LinkItem[];
		box: HTMLElement & { x: number, y: number, x1: number, x2: number, y1: number, y2: number };
		count_label: HTMLElement;
		linkclump: HTMLElement;
		overlay: HTMLElement | null;
		scroll_bug_ignore: boolean;
		os: OsType;

		timer: number;
		touch_timer: number;
		touch_active: boolean;
		pointer_type: string | null;
	}
}



// Content Scripts (https://wxt.dev/guide/essentials/entrypoints.html#content-scripts)
export default defineContentScript(
	{
		// Notes: content scripts (content.js) are called twice
		//
		// When building with WXT,
		// specifying "run_at": "document_end" in the "content_scripts" of the manifest causes the content scripts to be called twice.
		//
		// Notes: Error during build if ‘matches: [’<all_urls>‘]’ is not specified within defineContentScript() in content.js
		//
		// ERROR  Entrypoint validation failed: 1 error, 0 warnings
		// src\entrypoints\content.js	- ERROR matches is required (recieved: undefined)
		matches: [ "<all_urls>" ],

		// Executed when content script is loaded, can be async
		main
	}
);

function main() {
	browser.runtime.sendMessage(
		{
			message: "init"
		} as InitMessage
	).then((response: InitResponse | null) => {
		if (response === null) {
			console.error("Failed to initialize: received null response from background.");
		} else {
			if (Object.hasOwn(response, "error")) {
				console.warn("Failed to load settings, falling back to default settings:", response);
			}

			window.settings = response.actions;

			let allowed = true;
			for (const blocked of response.blocked) {
				if (!blocked || !blocked.match(/\S/g)) {
					continue;
				}
				const re = new RegExp(blocked, "i");

				if (re.test(window.location.href)) {
					allowed = false;
					console.info("Blocked on this site by matching pattern:", { pattern: blocked, url: window.location.href });
				}
			}

			if (allowed) {
				// setting up the box and count label
				window.linkclump = createCustomElement(CUSTOM_TAG_LINKCLUMP);
				window.linkclump.style.pointerEvents = "none";
				window.linkclump.style.touchAction = "none";
				window.box = create_box();
				window.count_label = create_count_label();

				(window.linkclump).appendChild(window.box);
				(window.linkclump).appendChild(window.count_label);
				(document.body).appendChild(window.linkclump);

				// add event listeners
				window.addEventListener("pointerdown", pointerdown, true);
				window.addEventListener("keydown", keydown, true);
				window.addEventListener("keyup", keyup, true);
				window.addEventListener("blur", blur, true);
				window.addEventListener("contextmenu", contextmenu, true);
				// non-passive: required to cancel native panning once the touch hold is confirmed
				window.addEventListener("touchmove", touchmove, { capture: true, passive: false });
			}
		}
	});

	browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
		if (request.message === "update") {
			window.settings = request.settings.actions;

			sendResponse("Update settings of content.js.");
		}
		if (request.message === "copyToClipboard") {
			const textarea = document.createElement("textarea");
			textarea.value = request.text;
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand("copy");
			document.body.removeChild(textarea);
		}
	});

	init();
}

function init() {
	window.settings = {};
	window.setting = -1;
	window.key_pressed = 0;
	window.mouse_button = null;
	window.stop_menu = false;
	window.box_on = false;
	window.smart_select = false;
	window.mouse_x = -1;
	window.mouse_y = -1;
	window.scroll_id = 0;
	window.links = [];
	// @ts-expect-error -- all will be right at the end of the function
	window.linkclump = undefined;
	// @ts-expect-error -- all will be right at the end of the function
	window.box = undefined;
	// @ts-expect-error -- all will be right at the end of the function
	window.count_label = undefined;
	window.overlay = null;
	window.scroll_bug_ignore = false;
	window.os = detectOs();
	window.timer = 0;
	window.touch_timer = 0;
	window.touch_active = false;
	window.pointer_type = null;
}

/**
 *
 * @param {string} tagName
 * @param {ElementCreationOptions} options - { is: "Custom Element Tag Name" }
 * @returns {HTMLElement}
 */
function createCustomElement(tagName: string, options?: ElementCreationOptions): HTMLElement {
	if (!tagName || typeof tagName !== "string") {
		throw (`Error, Invalid value passed to createCustomElement(tagName). tagName >> ${tagName}`);
	}

	const custom = document.createElement(tagName, options);

	return custom;
}

function create_box() {
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

function create_count_label() {
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

function pointermove(event: PointerEvent) {
	if (!isTrustedEvent(event)) {
		return;
	}

	prevent_escalation(event);
	if (allow_selection(event) || window.scroll_bug_ignore) {
		window.scroll_bug_ignore = false;
		update_box(event.pageX, event.pageY);

		// while detect keeps on calling false then recall the method
		while (!detect(event.pageX, event.pageY, false)) {
			// empty
		}
	} else {
		// only stop if the pointerup timer is no longer set
		if (window.timer === 0) {
			stop();
		}
	}
}

function clean_up() {
	// remove the box
	if (window.box) {
		window.box.style.borderWidth = "0px";
		window.box.style.top = "";
		window.box.style.left = "";
		window.box.style.width = "";
		window.box.style.height = "";
		window.box.style.visibility = "hidden";
	}
	if (window.count_label) {
		window.count_label.style.visibility = "hidden";
	}
	window.box_on = false;

	// remove the link boxes
	for (const link of window.links) {
		if (link.box !== null) {
			(window.linkclump).removeChild(link.box);
			link.box = null;
		}
	}
	window.links = [];

	// wipe clean the smart select
	window.smart_select = false;
	window.mouse_button = MOUSE_BUTTON_NONE;
	window.key_pressed = 0;
	window.pointer_type = null;
	window.touch_active = false;
	if (window.touch_timer !== 0) {
		clearTimeout(window.touch_timer);
		window.touch_timer = 0;
	}
}

function pointerdown(event: PointerEvent) {
	if (!isTrustedEvent(event)) {
		return;
	}

	window.pointer_type = event.pointerType;
	window.mouse_button = event.button;

	// Sync modifier keys from pointer event
	if (event.metaKey) {
		window.key_pressed = KEY_CODE_META;
	} else if (event.ctrlKey) {
		window.key_pressed = KEY_CODE_CTRL;
	} else if (event.shiftKey) {
		window.key_pressed = KEY_CODE_SHIFT;
	} else if (event.altKey) {
		window.key_pressed = KEY_CODE_ALT;
	}

	// turn on menu for non-Linux OS (Windows, Mac)
	if (window.os !== OS_LINUX) {
		window.stop_menu = false;
	}

	// Handle pure touch input with no physical keyboard modifier held
	if (event.pointerType === "touch" && window.key_pressed === 0) {
		// discard a hold that is still pending (e.g. a second finger touched down)
		cancelPendingTouchHold?.();

		// extra fingers (pinch/zoom) never start a hold gesture nor disturb a running selection
		if (!event.isPrimary) {
			return;
		}

		window.touch_active = false;

		// arm the hold only when a left-click action exists that touch could trigger
		if (findTouchSettingId() === undefined) {
			return;
		}

		const startX = event.pageX;
		const startY = event.pageY;

		const removeHoldListeners = () => {
			window.removeEventListener("pointermove", cancelTouchOnMove, true);
			window.removeEventListener("pointerup", cancelTouchOnEnd, true);
			window.removeEventListener("pointercancel", cancelTouchOnEnd, true);
			cancelPendingTouchHold = null;
		};

		const cancelTouchOnEnd = () => {
			if (window.touch_timer !== 0) {
				clearTimeout(window.touch_timer);
				window.touch_timer = 0;
			}
			removeHoldListeners();
		};

		const cancelTouchOnMove = (moveEvent: PointerEvent) => {
			const dx = Math.abs(moveEvent.pageX - startX);
			const dy = Math.abs(moveEvent.pageY - startY);
			if (dx > DRAG_THRESHOLD_MIN_PX || dy > DRAG_THRESHOLD_MIN_PX) {
				cancelTouchOnEnd();
			}
		};

		cancelPendingTouchHold = cancelTouchOnEnd;
		window.addEventListener("pointermove", cancelTouchOnMove, true);
		window.addEventListener("pointerup", cancelTouchOnEnd, true);
		window.addEventListener("pointercancel", cancelTouchOnEnd, true);

		window.touch_timer = setTimeout(
			() => {
				window.touch_timer = 0;
				removeHoldListeners();

				window.touch_active = true;
				if (startSelection(event, startX, startY)) {
					if (typeof navigator.vibrate === "function") {
						navigator.vibrate(30);
					}
				} else {
					// no action matched: hand the gesture back to the browser (scroll, native menu)
					window.touch_active = false;
				}
			},
			TOUCH_HOLD_TIMEOUT_MS
		);

		return;
	}

	startSelection(event, event.pageX, event.pageY);
}

function startSelection(event: PointerEvent, startX: number, startY: number): boolean {
	if (allow_selection(event)) {
		if (event.target instanceof Element && typeof event.target.setPointerCapture === "function") {
			try {
				event.target.setPointerCapture(event.pointerId);
			} catch {
				// Ignore
			}
		}

		// don't prevent for right click on Windows/Mac as it breaks spell checker
		// do prevent for left as otherwise the page becomes highlighted
		// (skipped for the delayed touch path: the original pointerdown has already been dispatched,
		// so preventDefault()/stopPropagation() would have no effect)
		if (!window.touch_active && (window.os === OS_LINUX || window.mouse_button === MOUSE_BUTTON_LEFT)) {
			prevent_escalation(event);
		}

		// if mouse up timer is set then clear it as it was just caused by bounce
		if (window.timer !== 0) {
			clearTimeout(window.timer);
			window.timer = 0;

			// keep menu off for non-Linux OS
			if (window.os !== OS_LINUX) {
				window.stop_menu = true;
			}
		} else {
			// clean up any mistakes
			if (window.box_on) {
				clean_up();
			}

			// update position
			window.box.x = startX;
			window.box.y = startY;
			update_box(startX, startY);

			// setup pointer move and pointer up
			window.addEventListener("pointermove", pointermove, true);
			window.addEventListener("pointerup", pointerup, true);
			window.addEventListener("pointercancel", pointercancel, true);
			window.addEventListener("wheel", wheel, { capture: true, passive: true });
			window.addEventListener("mousewheel", wheel, true);
			window.addEventListener("pointerout", pointerout, true);
		}

		return true;
	}

	return false;
}

function update_box(x: number, y: number) {
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

function wheel() {
	window.scroll_bug_ignore = true;
}

function pointerout(event: PointerEvent) {
	pointermove(event);

	// the wheel event might also call this event
	window.scroll_bug_ignore = true;
}

function pointercancel(event: PointerEvent) {
	if (!isTrustedEvent(event)) {
		return;
	}
	stop();
}

function prevent_escalation(event: Event) {
	event.stopPropagation();
	event.preventDefault();
}

function pointerup(event: PointerEvent) {
	if (!isTrustedEvent(event)) {
		return;
	}

	if (event.target instanceof Element && typeof event.target.releasePointerCapture === "function") {
		try {
			if (event.target.hasPointerCapture(event.pointerId)) {
				event.target.releasePointerCapture(event.pointerId);
			}
		} catch {
			// Ignore
		}
	}

	prevent_escalation(event);

	if (window.box_on) {
		// all the detection of the pointer to bounce
		if (allow_selection(event) && window.timer === 0) {
			window.timer = setTimeout(function () {
				update_box(event.pageX, event.pageY);
				detect(event.pageX, event.pageY, true);

				stop();
				window.timer = 0;
			}, MOUSEUP_BOUNCE_TIMEOUT_MS);
		} else if (window.timer === 0) {
			// selection is no longer allowed (e.g. modifier key released): cancel without opening links
			stop();
		}
	} else {
		// false alarm
		stop();
	}
}

function getXY(element: HTMLElement): { x: number, y: number } {
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

function start(): void {
	const selectedAction = window.settings[window.setting];

	if (selectedAction === undefined) {
		console.error("Selected action setting was not found.");
		return;
	}

	// stop user from selecting text/elements
	document.body.style.userSelect = "none";

	// turn on the box
	window.box.style.visibility = "visible";
	window.count_label.style.visibility = "visible";

	// find all links (find them each time as they could have moved)
	const page_links = document.links;


	// create RegExp once
	const re1 = /^javascript:/i;
	const ignoreList = selectedAction.options?.ignore ?? [];
	const re2 = new RegExp(ignoreList.slice(1).join("|"), "i");
	const re3 = /^H\d$/i;

	for (let i = 0; i < page_links.length; i++) {
		const rawLink = page_links[i];
		if (!rawLink) {
			continue;
		}

		// reject javascript: links
		if (re1.test(rawLink.href)) {
			continue;
		}

		// reject href="" or href="#"
		if (!rawLink.getAttribute("href") || rawLink.getAttribute("href") === "#") {
			continue;
		}

		// include/exclude links
		if (ignoreList.length > 1) {
			if (re2.test(rawLink.href) || re2.test(rawLink.innerHTML)) {
				if (Number(ignoreList[0]) === FILTER_EXCLUDE_LINKS) {
					continue;
				}
			} else if (Number(ignoreList[0]) === FILTER_INCLUDE_LINKS) {
				continue;
			}
		}

		// attempt to ignore invisible links (can't ignore overflow)
		const comp = window.getComputedStyle(rawLink, null);
		if (comp.visibility === "hidden" || comp.display === "none") {
			continue;
		}

		const pos = getXY(rawLink);
		let width = rawLink.offsetWidth;
		let height = rawLink.offsetHeight;

		// attempt to get the actual size of the link
		for (let k = 0; k < rawLink.childNodes.length; k++) {
			const child = rawLink.childNodes[k];
			if (child instanceof HTMLElement && child.nodeName === "IMG") {
				const pos2 = getXY(child);
				if (pos.y >= pos2.y) {
					pos.y = pos2.y;

					width = Math.max(width, child.offsetWidth);
					height = Math.max(height, child.offsetHeight);
				}
			}
		}

		// Attach Linkclump's custom coordinate and box management properties to the DOM element
		// Assert to the dedicated LinkItem type due to standard lib.dom.d.ts type limitations (custom properties undefined)
		const link = rawLink as LinkItem;
		link.x1 = pos.x;
		link.y1 = pos.y;
		link.x2 = pos.x + width;
		link.y2 = pos.y + height;
		link.height = height;
		link.width = width;
		link.box = null;
		link.important = Number(selectedAction.options?.smart) === SMART_SELECT_ON && rawLink.parentNode !== null && re3.test(rawLink.parentNode.nodeName);

		window.links.push(link);
	}

	window.box_on = true;

	// turn off menu for non-Linux OS so mouse up doesn't trigger context menu
	if (window.os !== OS_LINUX) {
		window.stop_menu = true;
	}
}

function stop() {
	// allow user to select text/elements
	document.body.style.userSelect = "";

	// turn off pointer move and pointer up
	window.removeEventListener("pointermove", pointermove, true);
	window.removeEventListener("pointerup", pointerup, true);
	window.removeEventListener("pointercancel", pointercancel, true);
	window.removeEventListener("wheel", wheel, true);
	window.removeEventListener("mousewheel", wheel, true);
	window.removeEventListener("pointerout", pointerout, true);

	cancelPendingTouchHold?.();
	if (window.touch_timer !== 0) {
		clearTimeout(window.touch_timer);
		window.touch_timer = 0;
	}
	window.touch_active = false;

	// a pending mouse-up bounce timer must not open links after the selection was cancelled
	if (window.timer !== 0) {
		clearTimeout(window.timer);
		window.timer = 0;
	}
	if (window.scroll_id) {
		clearInterval(window.scroll_id);
		window.scroll_id = 0;
	}

	if (window.box_on) {
		clean_up();
	}

	// turn on menu for linux
	if (window.os === OS_LINUX && window.settings[window.setting]?.key !== window.key_pressed) {
		window.stop_menu = false;
	}
}

function scroll() {
	if (allow_selection()) {
		const y = window.mouse_y - window.scrollY;
		const win_height = window.innerHeight;

		if (y > win_height - 20) { // down
			let speed = win_height - y;
			if (speed < 2) {
				speed = 60;
			} else if (speed < 10) {
				speed = 30;
			} else {
				speed = 10;
			}
			window.scrollBy(0, speed);
			window.mouse_y += speed;
			update_box(window.mouse_x, window.mouse_y);
			detect(window.mouse_x, window.mouse_y, false);

			window.scroll_bug_ignore = true;
			return;
		} else if (window.scrollY > 0 && y < 20) { // up
			let speed = y;
			if (speed < 2) {
				speed = 60;
			} else if (speed < 10) {
				speed = 30;
			} else {
				speed = 10;
			}
			window.scrollBy(0, -speed);
			window.mouse_y -= speed;
			update_box(window.mouse_x, window.mouse_y);
			detect(window.mouse_x, window.mouse_y, false);

			window.scroll_bug_ignore = true;
			return;
		}
	}

	clearInterval(window.scroll_id);
	window.scroll_id = 0;
}

function detect(x: number, y: number, open: boolean) {
	window.mouse_x = x;
	window.mouse_y = y;

	if (!window.box_on) {
		if (window.box.x2 - window.box.x1 < DRAG_THRESHOLD_MIN_PX && window.box.y2 - window.box.y1 < DRAG_THRESHOLD_MIN_PX) {
			return true;
		} else {
			start();
		}

	}

	if (!window.scroll_id) {
		window.scroll_id = setInterval(scroll, SCROLL_DETECT_INTERVAL_MS);
	}

	let count = 0;
	const count_tabs = new Set;
	const open_tabs = [];
	for (const link of window.links) {
		if (
			(!window.smart_select || link.important)
			&& !(
				link.x1 > window.box.x2
				|| link.x2 < window.box.x1
				|| link.y1 > window.box.y2
				|| link.y2 < window.box.y1
			)
		) {
			if (open) {
				open_tabs.push({
					"url": link.href,
					"title": link.innerText
				});
			}

			// check if important links have been selected and possibly redo
			if (!window.smart_select) {
				if (link.important) {
					window.smart_select = true;
					return false;
				}
			} else {
				if (link.important) {
					count++;
				}
			}

			if (link.box === null) {
				const link_box = document.createElement("span");
				link_box.className = "linkclump-link";
				link_box.style.margin = "0px auto";
				link_box.style.border = "1px solid red";
				link_box.style.position = "absolute";
				link_box.style.width = link.width + "px";
				link_box.style.height = link.height + "px";
				link_box.style.top = link.y1 + "px";
				link_box.style.left = link.x1 + "px";
				link_box.style.zIndex = (Z_INDEX_BASE - 1).toString();

				(window.linkclump).appendChild(link_box);
				link.box = link_box;
			} else {
				link.box.style.visibility = "visible";
			}

			count_tabs.add(link.href);
		} else {
			if (link.box !== null) {
				link.box.style.visibility = "hidden";
			}
		}
	}

	// important links were found, but not anymore so redo
	if (window.smart_select && count === 0) {
		window.smart_select = false;
		return false;
	}

	window.count_label.innerText = count_tabs.size.toString();

	if (open_tabs.length > 0) {
		browser.runtime.sendMessage({
			message: "activate",
			urls: open_tabs,
			setting: window.settings[window.setting]
		} as ActivateMessage);
	}

	return true;
}

function allow_key(keyCode: number) {
	for (const i in window.settings) {
		if (Number(window.settings[i]?.key) === keyCode) {
			return true;
		}
	}

	return false;
}

function keydown(event: KeyboardEvent) {
	if (!isTrustedEvent(event)) {
		return;
	}

	if (event.code !== KEY_CODE_END && event.code !== KEY_CODE_HOME) {
		let keyCode = event.keyCode;
		if (
			event.key === "Meta" ||
			event.code === "MetaLeft" ||
			event.code === "MetaRight" ||
			keyCode === KEY_CODE_META_FIREFOX_MAC ||
			keyCode === KEY_CODE_META_RIGHT
		) {
			keyCode = KEY_CODE_META;
		}
		window.key_pressed = keyCode;
		// turn menu off for linux
		if (window.os === OS_LINUX && allow_key(window.key_pressed)) {
			window.stop_menu = true;
		}
	} else {
		window.scroll_bug_ignore = true;
	}
}

function blur(event: FocusEvent) {
	if (!isTrustedEvent(event)) {
		return;
	}

	remove_key();

	// window lost focus (e.g. app switch) in the middle of a selection: cancel it
	if (event.target === window && (window.box_on || window.touch_timer !== 0)) {
		stop();
	}
}

function keyup(event: KeyboardEvent) {
	if (!isTrustedEvent(event)) {
		return;
	}

	if (event.code !== KEY_CODE_END && event.code !== KEY_CODE_HOME) {
		remove_key();
	}
}

function remove_key() {
	// turn menu on for linux
	if (window.os === OS_LINUX) {
		window.stop_menu = false;
	}
	window.key_pressed = 0;
}

/**
 * Picks the setting that a confirmed touch hold should trigger.
 * Touch input cannot press modifier keys, so a "Left click" setting without a key
 * (KEY_CODE_NONE) is preferred; otherwise the first left-click setting is used.
 *
 * @returns {string | undefined} The settings key, or undefined if no left-click setting exists.
 */
function findTouchSettingId(): string | undefined {
	let fallbackId: string | undefined;

	for (const i in window.settings) {
		const setting = window.settings[i];
		if (!setting || Number(setting.mouse) !== MOUSE_BUTTON_LEFT) {
			continue;
		}
		if (Number(setting.key) === KEY_CODE_NONE) {
			return i;
		}
		fallbackId ??= i;
	}

	return fallbackId;
}

function allow_selection(event?: PointerEvent): boolean {
	if (event) {
		if (event.metaKey && window.key_pressed === 0) {
			window.key_pressed = KEY_CODE_META;
		} else if (event.ctrlKey && window.key_pressed === 0) {
			window.key_pressed = KEY_CODE_CTRL;
		} else if (event.shiftKey && window.key_pressed === 0) {
			window.key_pressed = KEY_CODE_SHIFT;
		} else if (event.altKey && window.key_pressed === 0) {
			window.key_pressed = KEY_CODE_ALT;
		}
	}

	// Determine which setting a confirmed touch hold should trigger (once, before the loop)
	const touchSettingId = (window.pointer_type === "touch" && window.touch_active)
		? findTouchSettingId()
		: undefined;

	for (const i in window.settings) {
		const setting = window.settings[i];
		if (!setting) {
			continue;
		}

		const settingMouse = Number(setting.mouse);
		const settingKey = Number(setting.key);

		// On macOS, Ctrl + Left Click is synthesized by the OS as button: 2 (Right Click) with ctrlKey: true.
		// When the user configured Left Click + Ctrl, treat this simulated right click as a match.
		const isMacCtrlLeftClickEmulated =
			window.os === OS_MAC &&
			window.mouse_button === MOUSE_BUTTON_RIGHT &&
			window.key_pressed === KEY_CODE_CTRL &&
			settingMouse === MOUSE_BUTTON_LEFT &&
			settingKey === KEY_CODE_CTRL;

		let isMouseMatch = settingMouse === window.mouse_button || isMacCtrlLeftClickEmulated;
		let isKeyMatch = settingKey === window.key_pressed;

		// When touch hold is active without physical keyboard, allow the preferred left-button action
		if (touchSettingId !== undefined && i === touchSettingId) {
			isMouseMatch = true;
			isKeyMatch = true;
		}

		// need to check if key is 0 as key_pressed might not be accurate
		if (isMouseMatch && isKeyMatch) {
			window.setting = Number.parseInt(i, 10);

			if (window.box !== null) {
				// box
				window.box.style.border = "2px dotted " + (setting?.color ?? "red");

				// counter
				if ((setting?.color && typeof setting.color === "string") && (setting?.options && Object.hasOwn(setting.options, "samebgcolorasbox") && typeof setting.options.samebgcolorasbox === "boolean")) {
					if (setting.options.samebgcolorasbox === true) {
						window.count_label.style.color = "white";
						window.count_label.style.borderColor = "white";
						window.count_label.style.backgroundColor = setting.color.toString();
					} else {
						window.count_label.style.color = "black";
						window.count_label.style.borderColor = "transparent";
						window.count_label.style.backgroundColor = "transparent";
					}
				}
				if (setting?.options?.fontsizeofcounter && (typeof setting.options.fontsizeofcounter === "number")) {
					const num = setting.options.fontsizeofcounter;
					const base = num || COUNTER_FONT_SIZE_DEFAULT;

					window.count_label.style.fontSize = `${base * 1}px`;
					window.count_label.style.lineHeight = `${base * 1}px`;

					window.count_label.style.padding = `${base * 0.50}px`;
					window.count_label.style.borderWidth = `${base * 0.25}px`;
					window.count_label.style.borderRadius = `${base * 0.50}px`;
				} else {
					console.warn(`Invalid fontsizeofcounter value (expected number between ${COUNTER_FONT_SIZE_MIN} and ${COUNTER_FONT_SIZE_MAX}):`, setting.options.fontsizeofcounter);
				}
				if (setting?.options?.fontweightofcounter && (typeof setting.options.fontweightofcounter === "number") && (COUNTER_FONT_WEIGHT_MIN <= setting.options.fontweightofcounter && setting.options.fontweightofcounter <= COUNTER_FONT_WEIGHT_MAX)) {
					const weight = setting.options.fontweightofcounter;

					window.count_label.style.fontWeight = weight.toString();
				} else {
					console.warn(`Invalid fontweightofcounter value (expected number between ${COUNTER_FONT_WEIGHT_MIN} and ${COUNTER_FONT_WEIGHT_MAX}):`, setting.options.fontweightofcounter);
				}
			}

			return true;
		}
	}
	return false;
}

function contextmenu(event: MouseEvent) {
	if (!isTrustedEvent(event)) {
		return;
	}

	// Suppress the native long-press menu (e.g. Android Chrome) while a touch hold is pending or active
	const touchHoldInProgress = window.pointer_type === "touch" && (window.touch_timer !== 0 || window.touch_active);

	if (window.stop_menu || touchHoldInProgress) {
		event.preventDefault();
	}
}

/**
 * Cancels native touch panning after the touch hold gesture has been confirmed,
 * so that the drag is handled as a link selection instead of a page scroll.
 * NOTE: `touch-action` is fixed at the start of a touch sequence, so it cannot be
 * switched to "none" after the 500ms hold. A non-passive `touchmove` listener is used instead.
 */
function touchmove(event: TouchEvent) {
	if (window.touch_active && event.cancelable) {
		event.preventDefault();
	}
}

function updateDocumentDimensions() {
	const width = Math.max(document.documentElement.clientWidth, document.body.scrollWidth, document.documentElement.scrollWidth, document.body.offsetWidth, document.documentElement.offsetWidth);
	const height = Math.max(document.documentElement.clientHeight, document.body.scrollHeight, document.documentElement.scrollHeight, document.body.offsetHeight, document.documentElement.offsetHeight);
	const scrollbarWidth = window.innerWidth - document.body.clientWidth;

	return { width, height, scrollbarWidth };
}

/**
 * Validates if the event is a trusted user gesture originating from the browser.
 * This is a security measure to prevent Confused Deputy attacks where a malicious
 * webpage attempts to trigger privileged actions via synthesized DOM events.
 *
 * @param {Event} event - The DOM event to validate.
 * @returns {boolean} True if the event is trusted (user-initiated), false otherwise.
 */
function isTrustedEvent(event: Event): boolean {
	return event?.isTrusted ?? false;
}

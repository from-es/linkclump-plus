// WXT provided cross-browser compatible API.
import { browser } from "wxt/browser";

import { OS_LINUX } from "@/assets/js/constants/os";
import {
	MOUSE_BUTTON_LEFT,
	MOUSE_BUTTON_NONE
} from "@/assets/js/constants/mouseButton";
import {
	MOUSEUP_BOUNCE_TIMEOUT_MS,
	SCROLL_DETECT_INTERVAL_MS
} from "@/assets/js/constants/timing";
import { Z_INDEX_BASE, DRAG_THRESHOLD_MIN_PX } from "@/assets/js/constants/ui";
import {
	SMART_SELECT_ON,
	FILTER_EXCLUDE_LINKS,
	FILTER_INCLUDE_LINKS
} from "@/assets/js/constants/action";

import { isTrustedEvent } from "../utils/isTrustedEvent";
import { getXY, updateBox } from "../dom/selectionBox";
import { cancelTouchHold } from "../touch/touchHold";
import { allowSelection } from "../matching/allowSelection";

import type { LinkItem } from "@/assets/js/types/Content";
import type { ActivateMessage } from "@/assets/js/types/Messages";

/**
 * Stops an event from bubbling and cancels its default action, used while a selection is
 * in progress to keep the page from reacting to the same pointer activity (e.g. text
 * selection, native drag, or a site's own click handlers).
 *
 * @param {Event} event - The event to suppress.
 * @returns {void}
 */
export function preventEscalation(event: Event): void {
	event.stopPropagation();
	event.preventDefault();
}

/**
 * Tracks the pointer during an active selection: resizes the box to follow it and
 * re-evaluates which links fall inside it (detect() is called in a loop because a smart
 * selection restart - see detect()'s `false` return - needs to be retried against the
 * same coordinates). If the mouse+key combination driving the selection is no longer
 * valid, ends the selection instead (unless a mouseup bounce timer is about to do so).
 * Only registered while a selection is active; see startSelection()/stop().
 *
 * @param {PointerEvent} event - The pointermove event.
 * @returns {void}
 */
export function pointermove(event: PointerEvent): void {
	if (!isTrustedEvent(event)) {
		return;
	}

	preventEscalation(event);
	if (allowSelection(event) || window.scroll_bug_ignore) {
		window.scroll_bug_ignore = false;
		updateBox(event.pageX, event.pageY);

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

/**
 * Treats the pointer leaving the window the same as a move (so the box/links stay up to
 * date right up to the edge), then marks the next wheel-triggered pointer event to be
 * ignored, since leaving the window can itself fire a spurious wheel event. Only
 * registered while a selection is active; see startSelection()/stop().
 *
 * @param {PointerEvent} event - The pointerout event.
 * @returns {void}
 */
export function pointerout(event: PointerEvent): void {
	pointermove(event);

	// the wheel event might also call this event
	window.scroll_bug_ignore = true;
}

/**
 * Ends the current selection when the browser cancels the pointer (e.g. the OS takes over
 * the gesture for its own purposes, such as a system-level swipe). Only registered while a
 * selection is active; see startSelection()/stop().
 *
 * @param {PointerEvent} event - The pointercancel event.
 * @returns {void}
 */
export function pointercancel(event: PointerEvent): void {
	if (!isTrustedEvent(event)) {
		return;
	}
	stop();
}

/**
 * Marks the next pointer event as one to ignore the usual mouse/key re-check for, since
 * scrolling the page with the wheel mid-selection can itself trigger pointer events that
 * would otherwise look like the selection's button/key is no longer held. Only registered
 * while a selection is active; see startSelection()/stop().
 *
 * @returns {void}
 */
export function wheel(): void {
	window.scroll_bug_ignore = true;
}

/**
 * Finishes (or cancels) the current selection when the pointer is released. If the
 * button+key combination still matches a configured setting, waits a short "bounce"
 * window (in case this release is immediately followed by another press meant to extend
 * the same selection) before detecting links at the release point, opening them, and
 * stopping; otherwise stops immediately without opening anything. Also releases pointer
 * capture if this pointer had it. Only registered while a selection is active; see
 * startSelection()/stop().
 *
 * @param {PointerEvent} event - The pointerup event.
 * @returns {void}
 */
export function pointerup(event: PointerEvent): void {
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

	preventEscalation(event);

	if (window.box_on) {
		// all the detection of the pointer to bounce
		if (allowSelection(event) && window.timer === 0) {
			window.timer = setTimeout(function () {
				updateBox(event.pageX, event.pageY);
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

/**
 * Hides and resets the selection box and counter, removes every per-link highlight box
 * from the page, and clears all of the "a selection is in progress" state on `window`
 * (box_on, smart_select, mouse_button, pointer_type, touch_active, and any pending touch
 * hold). Deliberately leaves `window.key_pressed` untouched - see the inline comment on
 * that line for why. Called both from stop() and, defensively, from startSelection() if a
 * previous selection was somehow left stuck active.
 *
 * @returns {void}
 */
export function cleanUp(): void {
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
	// NOTE: key_pressed is intentionally left as-is here. It is owned by keydown/keyup/blur
	// (and re-synced from event.metaKey/ctrlKey/shiftKey/altKey on the next pointerdown), so a
	// non-modifier key (e.g. the default "z") held through the end of one selection still arms
	// the next one without requiring the user to release and re-press it.
	window.pointer_type = null;
	window.touch_active = false;
	// Also called from stop() below; calling it from both keeps a pending touch hold from
	// ever surviving past the end of a selection, however this function was reached.
	cancelTouchHold();
}

/**
 * Begins tracking a potential selection at (startX, startY) if the current mouse+key
 * combination matches a configured setting: captures the pointer, positions the box's
 * anchor corner, and registers the selection-only listeners (pointermove/pointerup/
 * pointercancel/wheel/pointerout) that pointermove() etc. rely on. If this call is itself
 * the trailing edge of a mouseup "bounce" window, it instead just cancels that pending
 * timer and keeps the context menu suppressed, without re-registering listeners. Does not
 * yet mark the selection as visually active - see start(), which the subsequent drag
 * threshold triggers via detect().
 *
 * @param {PointerEvent} event - The pointerdown event that may start a selection.
 * @param {number} startX - The page X coordinate to anchor the box at.
 * @param {number} startY - The page Y coordinate to anchor the box at.
 * @returns {boolean} True if the mouse+key combination matched and tracking began (or the
 *   bounce window was renewed); false if nothing matched.
 */
export function startSelection(event: PointerEvent, startX: number, startY: number): boolean {
	if (allowSelection(event)) {
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
			preventEscalation(event);
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
				cleanUp();
			}

			// update position
			window.box.x = startX;
			window.box.y = startY;
			updateBox(startX, startY);

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

/**
 * Makes the selection visually active once the drag has moved far enough (called from
 * detect() when the box first exceeds the drag threshold): shows the box/counter,
 * disables text selection on the page, and scans every link currently on the page -
 * filtering out javascript:/empty/invisible links and any the selected Action's
 * include/exclude pattern rejects - recording each candidate's position, size, and
 * "important" flag (used by smart selection) into `window.links` for detect() to match
 * against as the box grows.
 *
 * @returns {void}
 */
export function start(): void {
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

/**
 * Ends the current selection attempt, whether or not it ever became visually active:
 * re-enables text selection, removes the selection-only listeners registered by
 * startSelection(), cancels any pending touch hold and mouseup bounce timer, stops the
 * scroll-while-dragging interval, and - if the box had actually been shown - delegates to
 * cleanUp() to clear the box/links/selection state. On Linux, also re-arms the native
 * context menu once the key that was suppressing it is no longer the one held.
 *
 * @returns {void}
 */
export function stop(): void {
	// allow user to select text/elements
	document.body.style.userSelect = "";

	// turn off pointer move and pointer up
	window.removeEventListener("pointermove", pointermove, true);
	window.removeEventListener("pointerup", pointerup, true);
	window.removeEventListener("pointercancel", pointercancel, true);
	window.removeEventListener("wheel", wheel, true);
	window.removeEventListener("mousewheel", wheel, true);
	window.removeEventListener("pointerout", pointerout, true);

	cancelTouchHold();
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
		cleanUp();
	}

	// turn on menu for linux
	if (window.os === OS_LINUX && window.settings[window.setting]?.key !== window.key_pressed) {
		window.stop_menu = false;
	}
}

/**
 * Auto-scrolls the page while the pointer is held near the top or bottom edge of the
 * viewport during an active selection, so links further up/down the page can still be
 * reached without the user running out of screen to drag into. Speed increases the closer
 * the pointer is to the edge. Re-runs detect() after each scroll step since the box's
 * position relative to the page has changed. Invoked on an interval started by detect();
 * stops that interval once the mouse+key combination no longer matches or the pointer has
 * moved away from both edges.
 *
 * @returns {void}
 */
export function scroll(): void {
	if (allowSelection()) {
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
			updateBox(window.mouse_x, window.mouse_y);
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
			updateBox(window.mouse_x, window.mouse_y);
			detect(window.mouse_x, window.mouse_y, false);

			window.scroll_bug_ignore = true;
			return;
		}
	}

	clearInterval(window.scroll_id);
	window.scroll_id = 0;
}

/**
 * The core hit-testing loop, called on every pointer move during a selection attempt.
 *
 * Before the box has grown past the drag threshold, does nothing but report whether that
 * threshold has now been crossed (via its return value) - once it has, calls start() to
 * actually begin the visible selection. After that, starts the auto-scroll interval if
 * needed, then walks every candidate link, showing/hiding its highlight box depending on
 * whether it now overlaps the selection box, and (when `open` is true, i.e. on release)
 * collects the overlapping links to be opened via a message to the background script.
 * "Smart select": if an "important" link (see start()) enters the box, the whole
 * selection restarts in smart mode, which only collects important links; if the last
 * important link leaves the box again, smart mode is dropped and selection restarts in
 * normal mode. In both restart cases this function returns false so callers (pointermove's
 * loop) immediately re-run it against the same coordinates under the new mode.
 *
 * @param {number} x - The page X coordinate to test against (also stored on `window.mouse_x`).
 * @param {number} y - The page Y coordinate to test against (also stored on `window.mouse_y`).
 * @param {boolean} open - Whether overlapping links should be collected to be opened (true on pointerup).
 * @returns {boolean} False if smart-select mode just changed and the caller should
 *   immediately re-run detect() at the same coordinates; true otherwise (including the
 *   "drag threshold not yet reached" case).
 */
export function detect(x: number, y: number, open: boolean): boolean {
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

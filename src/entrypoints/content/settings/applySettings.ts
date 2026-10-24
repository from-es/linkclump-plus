import {
	createBox,
	createCountLabel,
	createCustomElement
} from "../dom/selectionBox";
import {
	blur,
	keydown,
	keyup
} from "../keyboard/keyState";
import {
	contextmenu,
	pointerdown,
	touchmove
} from "../pointer/pointerEvents";
import { stop } from "../selection/lifecycle";
import { isBlockedUrl } from "./blocklist";

import { CUSTOM_TAG_LINKCLUMP } from "@/assets/js/constants/ui";

import type { Settings } from "@/assets/js/types/Settings";

/**
 * Aborts the listeners registered by enableContentScript() all at once. Null while the content script is
 * turned off for this frame (blocked URL, or settings not loaded yet).
 */
let listenerController: AbortController | null = null;

/**
 * Applies the settings received from the background script (on page load and whenever the
 * settings are updated): stores the actions, then turns this content script on or off for
 * this frame depending on whether the URL of the frame matches the blocklist. Calling it
 * again with changed settings therefore takes effect without reloading the page.
 *
 * @param {Pick<Settings, "actions" | "blocked">} settings - Settings received from the background.
 * @returns {void}
 */
export function applySettings(settings: Pick<Settings, "actions" | "blocked">): void {
	window.settings = settings.actions;

	if (isBlockedUrl(settings.blocked, window.location.href)) {
		disableContentScript();
	} else {
		enableContentScript();
	}
}

/**
 * Turns the content script on for this frame: creates the selection box and count label,
 * appends them to the DOM, and registers the always-on event listeners. Does nothing if already enabled.
 *
 * @returns {void}
 */
function enableContentScript(): void {
	if (listenerController !== null) {
		return;
	}

	listenerController = new AbortController();
	const { signal } = listenerController;

	// setting up the box and count label
	window.linkclump = createCustomElement(CUSTOM_TAG_LINKCLUMP);
	window.linkclump.style.pointerEvents = "none";
	window.linkclump.style.touchAction = "none";
	window.box = createBox();
	window.count_label = createCountLabel();

	(window.linkclump).appendChild(window.box);
	(window.linkclump).appendChild(window.count_label);
	(document.body).appendChild(window.linkclump);

	// add event listeners (all of them are removed at once through the signal in disableContentScript())
	window.addEventListener("pointerdown", pointerdown, { capture: true, signal });
	window.addEventListener("keydown", keydown, { capture: true, signal });
	window.addEventListener("keyup", keyup, { capture: true, signal });
	window.addEventListener("blur", blur, { capture: true, signal });
	window.addEventListener("contextmenu", contextmenu, { capture: true, signal });
	// non-passive: required to cancel native panning once the touch hold is confirmed
	window.addEventListener("touchmove", touchmove, { capture: true, passive: false, signal });
}

/**
 * Turns the content script off for this frame: removes the always-on event listeners,
 * ends any selection in progress, resets state, and removes the selection box from the page.
 * Does nothing if already disabled.
 *
 * @returns {void}
 */
function disableContentScript(): void {
	if (listenerController === null) {
		return;
	}

	listenerController.abort();
	listenerController = null;

	// end a selection in progress; this has to run before the box element is removed because
	// it also removes the link boxes from it
	stop();
	window.key_pressed = 0;
	window.stop_menu = false;

	window.linkclump.remove();
}

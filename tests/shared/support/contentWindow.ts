/**
 * Helpers for tests of the content script, which keeps its state on `window`.
 *
 * @file
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 */

import { OS_WIN } from "@/assets/js/constants/os";
import { MOUSE_BUTTON_NONE } from "@/assets/js/constants/mouseButton";
import { CUSTOM_TAG_LINKCLUMP } from "@/assets/js/constants/ui";
import { type IntentionalAnyForValidation } from "../types";

/**
 * Resets every `window.*` global used by the content script to a neutral "idle" state:
 * no selection, no keys, no timers, empty settings, and a fresh box, counter label and container in the DOM.
 *
 * @returns The created container, box and counter label.
 */
export function resetContentWindow() {
	document.body.innerHTML = "";
	document.body.style.userSelect = "";

	const linkclump = document.createElement(CUSTOM_TAG_LINKCLUMP);
	const box = Object.assign(document.createElement("span"), { x: 0, y: 0, x1: 0, x2: 0, y1: 0, y2: 0 });
	const countLabel = document.createElement("span");
	document.body.append(linkclump);

	window.os = OS_WIN;
	window.settings = {} as IntentionalAnyForValidation;
	window.setting = 0;
	window.key_pressed = 0;
	window.mouse_button = MOUSE_BUTTON_NONE;
	window.pointer_type = null;
	window.stop_menu = false;
	window.touch_active = false;
	window.box_on = false;
	window.smart_select = false;
	window.scroll_bug_ignore = false;
	window.mouse_x = 0;
	window.mouse_y = 0;
	window.timer = 0;
	window.scroll_id = 0;
	window.links = [];
	window.linkclump = linkclump;
	window.box = box;
	window.count_label = countLabel;

	return { linkclump, box, countLabel };
}

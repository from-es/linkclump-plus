// WXT provided cross-browser compatible API.
import { browser } from "wxt/browser";

import { CUSTOM_TAG_LINKCLUMP } from "@/assets/js/constants/ui";
import { detectOs } from "@/assets/js/lib/detectOs";

import {
	createBox,
	createCountLabel,
	createCustomElement
} from "./dom/selectionBox";
import {
	blur,
	keydown,
	keyup
} from "./keyboard/keyState";
import {
	contextmenu,
	pointerdown,
	touchmove
} from "./pointer/pointerEvents";

import type {
	InitMessage,
	InitResponse
} from "@/assets/js/types/Messages";

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

/**
 * The content script's entry point (passed to `defineContentScript`).
 *
 * @returns {void}
 */
function main(): void {
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
				window.box = createBox();
				window.count_label = createCountLabel();

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

/**
 * Resets all of this content script's per-page state on `window` to its initial values
 * (no settings loaded yet, no active selection, no touch in progress) and re-detects the
 * host OS. Called once from main() on page load; does not remove or re-add any event
 * listeners.
 *
 * @returns {void}
 */
function init(): void {
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
	window.touch_active = false;
	window.pointer_type = null;
}

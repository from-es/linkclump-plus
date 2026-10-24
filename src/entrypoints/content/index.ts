// WXT provided cross-browser compatible API.
import { browser } from "wxt/browser";

import { detectOs } from "@/assets/js/lib/detectOs";
import { applySettings } from "./settings/applySettings";

import type {
	InitMessage,
	InitResponse
} from "@/assets/js/types/Messages";

// Content Scripts (https://wxt.dev/guide/essentials/entrypoints.html#content-scripts)
export default defineContentScript(
	{
		// Required by WXT / WebExtensions manifest: matches must specify URL patterns
		matches: [ "<all_urls>" ],

		// Run in all frames (including iframes) to detect embedded links
		allFrames: true,

		// Execute after the page has finished loading (same as manifest default)
		runAt: "document_idle",

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
	).then((response: InitResponse | null | undefined) => {
		if (!response) {
			console.error("Failed to initialize: received an empty response from background.");
		} else {
			if (Object.hasOwn(response, "error")) {
				console.warn("Failed to load settings, falling back to default settings:", response);
			}

			applySettings(response);
		}
	}).catch((error: unknown) => {
		console.error("[content] Failed to initialize:", error);
	});

	browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
		if (request.message === "update") {
			applySettings(request.settings);

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

/**
 * This module handles incoming messages in the background script of the Linkclump extension.
 * It processes activation, initialization, and update messages, dispatching them to the appropriate handlers.
 * The module ensures that settings are loaded, saved, and updated correctly across all open tabs.
 */

// WXT provided cross-browser compatible API and Types
import type { Browser } from "wxt/browser";

import { safeAsync } from "@/assets/js/lib/safeAsync";
import { handleActivate } from "./handleActivate";
import { handleUpdateSettings } from "./handleUpdateSettings";

import type {
	ActivateMessage,
	Messages,
	UpdateMessage
} from "@/assets/js/types/Messages";
import type { Deps } from "../deps";

/**
 * Main runtime message dispatcher handling activate, init, and update messages.
 *
 * @param {Messages} request - Message payload from content scripts or extension pages.
 * @param {Browser.runtime.MessageSender} sender - Details of the message sender.
 * @param {(response?: unknown) => void} sendResponse - Callback that sends the reply to the sender.
 * @param {Deps} deps - Dependencies created in index.ts.
 * @returns {boolean} True if the reply is sent asynchronously through sendResponse (this keeps the
 *   message channel open), otherwise false.
 */
export function handleRequests(
	request: Messages,
	sender: Browser.runtime.MessageSender,
	sendResponse: (response?: unknown) => void,
	deps: Deps
): boolean {
	switch (request.message) {
		case "activate": {
			handleActivate(request as ActivateMessage, sender);
			return false;
		}
		case "init": {
			// Notes: Reply through sendResponse and return true, instead of returning a Promise from the
			// listener: returning a Promise directly is only supported natively starting in Chrome 148+,
			// while minimum_chrome_version is set to 125. Always answer (undefined on failure) so that
			// the sender does not wait forever for a reply.
			safeAsync("init", async () => {
				try {
					sendResponse(await deps.settingsManager.load());
				} catch (error) {
					sendResponse(undefined);
					throw error;
				}
			}, "background");
			return true;
		}
		case "update": {
			safeAsync("handleUpdateSettings", () => handleUpdateSettings(request as UpdateMessage, deps), "background");
			return false;
		}
		default: {
			return false;
		}
	}
}

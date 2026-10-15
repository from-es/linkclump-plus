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
import type { Settings } from "@/assets/js/types/Settings";
import type { Deps } from "../deps";

/**
 * Main runtime message dispatcher handling activate, init, and update messages.
 *
 * @param {Messages} request - Message payload from content scripts or extension pages.
 * @param {Browser.runtime.MessageSender} sender - Details of the message sender.
 * @param {Deps} deps - Dependencies created in index.ts.
 * @returns {Promise<Settings> | void} Settings promise on init, or void.
 */
export function handleRequests(
	request: Messages,
	sender: Browser.runtime.MessageSender,
	deps: Deps
): Promise<Settings> | void {
	switch (request.message) {
		case "activate": {
			handleActivate(request as ActivateMessage, sender);
			break;
		}
		case "init": {
			return deps.settingsManager.load();
		}
		case "update": {
			safeAsync("handleUpdateSettings", () => handleUpdateSettings(request as UpdateMessage, deps), "background");
			return;
		}
	}
}

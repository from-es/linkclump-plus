/**
 * This module handles incoming messages in the background script of the Linkclump extension.
 * It processes activation, initialization, and update messages, dispatching them to the appropriate handlers.
 * The module ensures that settings are loaded, saved, and updated correctly across all open tabs.
 */

// WXT provided cross-browser compatible API and Types
import { browser, type Browser } from "wxt/browser";

import { handleActivate } from "./handleActivate";

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
			deps.settingsManager.save(request.settings).then(async () => {
				const windowList = await browser.windows.getAll({
					populate: true
				});
				const currentSettings = await deps.settingsManager.load();
				windowList.forEach(function (window) {
					if (!window.tabs) {
						return;
					}

					window.tabs.forEach(function (tab) {
						if (!(tab?.id && tab?.url)) {
							return;
						}

						const regex = /^(file|https?):\/\//i;
						if (!regex.test(tab.url)) {
							return;
						}

						const sendMessageToTab = browser.tabs.sendMessage(
							tab.id,
							{
								message: "update",
								settings: currentSettings
							} as UpdateMessage
						);

						sendMessageToTab
							.then(
								() => {
									// console.debug("Successfully sent update message to tab:", { tab, response });
								}
							)
							.catch(
								(error) => {
									// When sending a message to a tab other than "http or https or file",
									// "Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist." occurs in "background.js".
									console.debug("Failed to send update message to tab:", { tab, error });
								}
							);
					});
				});
			});

			return;
		}
	}
}

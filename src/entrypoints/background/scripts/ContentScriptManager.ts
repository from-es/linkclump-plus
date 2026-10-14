/**
 * This module manages content script operations across open browser tabs,
 * including first-run injection into existing tabs and broadcasting settings updates.
 */

// WXT provided cross-browser compatible API
import { browser } from "wxt/browser";

import type { SettingsManager } from "../settings/SettingsManager";
import type { UpdateMessage } from "@/assets/js/types/Messages";

// Content script bundle generated for the "content" entrypoint
const CONTENT_SCRIPT_PATH = "/content-scripts/content.js" as const;

export class ContentScriptManager {
	private readonly settingsManager: SettingsManager;

	constructor(settingsManager: SettingsManager) {
		this.settingsManager = settingsManager;
	}

	/**
	 * Injects the content script into open HTTP(S) tabs (used on first-run installation).
	 *
	 * @returns {Promise<void>}
	 */
	async injectIntoExistingTabs(): Promise<void> {
		const windows = await browser.windows.getAll({ populate: true });
		for (let i = 0; i < windows.length; i++) {
			const win = windows[i];
			if (!win) {
				continue;
			}

			const numberOfTabs = win.tabs?.length;
			if (numberOfTabs === undefined) {
				continue;
			}

			for (let j = 0; j < numberOfTabs; j++) {
				const tab = win.tabs?.[j];
				const url = tab?.url;
				const id = tab?.id;
				if (!url || !id) {
					continue;
				}

				if (!/^https?:\/\//.test(url)) {
					continue;
				}

				browser.scripting.executeScript({
					target: { tabId: id },
					files: [ CONTENT_SCRIPT_PATH ]
				}).catch((error) => {
					console.warn("Failed to inject content script into tab:", { id, url, error });
				});
			}
		}
	}

	/**
	 * Broadcasts the current settings to all open HTTP(S) and file tabs.
	 *
	 * @returns {Promise<void>}
	 */
	async broadcastSettingsUpdate(): Promise<void> {
		const windowList = await browser.windows.getAll({
			populate: true
		});
		const currentSettings = await this.settingsManager.load();

		windowList.forEach((window) => {
			if (!window.tabs) {
				return;
			}

			window.tabs.forEach((tab) => {
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
	}
}

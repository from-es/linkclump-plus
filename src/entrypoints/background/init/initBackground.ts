/**
 * This module handles the initialization of the background script for the Linkclump extension.
 * It checks if the extension is being run for the first time or if an update is required,
 * and performs necessary actions such as injecting content scripts into existing tabs and
 * opening the options page for user configuration.
 */

// WXT provided cross-browser compatible API
import { browser } from "wxt/browser";

import {
	OPTIONS_WINDOW_CENTER_OFFSET_X,
	OPTIONS_WINDOW_CENTER_OFFSET_Y,
	OPTIONS_WINDOW_DEFAULT_HEIGHT,
	OPTIONS_WINDOW_DEFAULT_WIDTH
} from "@/assets/js/constants/window";

import { settingsManager } from "../settings/SettingsManager";

/**
 * Handles extension first-run initialization and configuration updates.
 * Injects content scripts into active tabs and opens the options page on first run.
 *
 * @returns {Promise<void>} Promise resolving when initialization completes.
 */
export async function initBackground(): Promise<void> {
	if (!(await settingsManager.isInit())) {
		// initialize settings manager with defaults and to stop this appearing again.
		await settingsManager.init();

		// inject Linkclump into windows currently open to make it just work
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
					files: [ "/content-scripts/content.js" ]
				}).catch((error) => {
					console.warn("Failed to inject content script into tab:", { id, url, error });
				});
			}
		}

		// pop up window to show tour and options page
		const windowOptions: {
			url: string;
			width: number;
			height: number;
			left?: number;
			top?: number;
		} = {
			url: browser.runtime.getURL("/options.html?init=true"),
			width: OPTIONS_WINDOW_DEFAULT_WIDTH,
			height: OPTIONS_WINDOW_DEFAULT_HEIGHT
		};
		if (typeof screen !== "undefined" && screen.width && screen.height) {
			windowOptions.left = Math.round(screen.width / 2 - OPTIONS_WINDOW_CENTER_OFFSET_X / 2);
			windowOptions.top = Math.round(screen.height / 2 - OPTIONS_WINDOW_CENTER_OFFSET_Y / 2);
		}
		browser.windows.create(windowOptions);
	} else if (!(await settingsManager.isLatest())) {
		await settingsManager.update();
	}
}

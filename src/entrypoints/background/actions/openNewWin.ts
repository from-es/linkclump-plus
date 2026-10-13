// WXT provided cross-browser compatible API
import { browser } from "wxt/browser";

import { openTab } from "../utils/openTab";

import type {
	ActivateMessage,
	ActivateMessage_win
} from "@/assets/js/types/Messages";

/**
 * Handles opening links in a new window. The first link opens the window,
 * and remaining links are queued as tabs.
 *
 * @param {ActivateMessage<ActivateMessage_win>} request - Activate message for win action.
 * @returns {Promise<void>} Promise resolving when window creation logic completes.
 */
export async function handleOpenNewWin(request: ActivateMessage<ActivateMessage_win>): Promise<void> {
	const currentWindow = await browser.windows.getCurrent();
	const url = request.urls.shift()?.url;

	if (!url) {
		return;
	}

	const window = await browser.windows.create({
		url: url,
		"focused": !request.setting.options.unfocus
	});

	const windowId = window ? window.id : currentWindow.id;

	if (request.urls.length > 0) {
		openTab(
			request.urls,
			request.setting.options.delay,
			windowId,
			undefined,
			undefined,
			0
		);
	}

	if (currentWindow.id && request.setting.options.unfocus) {
		await browser.windows.update(
			currentWindow.id,
			{ "focused": true }
		);
	}
}

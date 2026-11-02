// WXT provided cross-browser compatible API and Types
import { browser, type Browser } from "wxt/browser";

import { SECONDS_TO_MS } from "@/assets/js/constants/timing";

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
 * @param {Browser.runtime.MessageSender} sender - Sender of the message containing tab information.
 * @returns {Promise<void>} Promise resolving when window creation logic completes.
 */
export async function handleOpenNewWin(request: ActivateMessage<ActivateMessage_win>, sender: Browser.runtime.MessageSender): Promise<void> {
	const url = request.urls.shift()?.url;
	if (!url) {
		return;
	}

	const window = await browser.windows.create({
		url: url,
		"focused": !request.setting.options.unfocus
	});

	// The window where the links were selected. It is used to give the focus back when the new
	// window must not take it. The "current window" of the background script is the last focused
	// window and needs an extra round trip, so it is not used.
	const senderWindowId = sender.tab?.windowId;
	const windowId = window ? window.id : senderWindowId;
	const delay = (request.setting.options.delay ?? 0) * SECONDS_TO_MS;

	if (request.urls.length > 0) {
		openTab(
			request.urls,
			delay,
			windowId,
			undefined,
			undefined,
			0
		);
	}

	if (senderWindowId !== undefined && request.setting.options.unfocus) {
		await browser.windows.update(
			senderWindowId,
			{ "focused": true }
		);
	}
}

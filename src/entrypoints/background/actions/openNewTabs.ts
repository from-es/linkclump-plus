// WXT provided cross-browser compatible API and Types
import { browser, type Browser } from "wxt/browser";

import { openTab } from "../utils/openTab";

import { SECONDS_TO_MS } from "@/assets/js/constants/timing";


import type {
	ActivateMessage,
	ActivateMessage_tabs
} from "@/assets/js/types/Messages";

/**
 * Handles opening links as new tabs in the current window.
 *
 * @param {ActivateMessage<ActivateMessage_tabs>} request - Activate message for tabs action.
 * @param {Browser.runtime.MessageSender} sender - Sender of the message containing tab information.
 * @returns {Promise<void>} Promise resolving when opening tabs has been initiated.
 */
export async function handleOpenNewTabs(request: ActivateMessage<ActivateMessage_tabs>, sender: Browser.runtime.MessageSender): Promise<void> {
	if (sender.tab === undefined || sender.tab.id === undefined) {
		return;
	}

	const tab = await browser.tabs.get(sender.tab.id);
	let tabIndex = null;

	if (!request.setting.options.end) {
		tabIndex = tab.index + 1;
	}

	// Open the tabs in the window of the tab where the links were selected. The "current window"
	// of the background script is the last focused window, which can be a different one.
	const windowId = tab.windowId;
	const delay = (request.setting.options.delay ?? 0) * SECONDS_TO_MS;
	const closeTime = (request.setting.options.close ?? 0) * SECONDS_TO_MS;

	openTab(
		request.urls,
		delay,
		windowId,
		tab.id,
		tabIndex,
		closeTime
	);
}

// WXT provided cross-browser compatible API
import { browser } from "wxt/browser";

import { openTab } from "../utils/openTab";

// WXT provided cross-browser Types
import type { Browser } from "wxt/browser";

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
export async function handleTab(request: ActivateMessage<ActivateMessage_tabs>, sender: Browser.runtime.MessageSender): Promise<void> {
	if (sender.tab === undefined || sender.tab.id === undefined) {
		return;
	}

	const tab = await browser.tabs.get(sender.tab.id);
	const currentWindow = await browser.windows.getCurrent();
	let tabIndex = null;

	if (!request.setting.options.end) {
		tabIndex = tab.index + 1;
	}

	const windowId = currentWindow ? currentWindow.id : undefined;

	openTab(
		request.urls,
		request.setting.options.delay,
		windowId,
		tab.id,
		tabIndex,
		request.setting.options.close
	);
}

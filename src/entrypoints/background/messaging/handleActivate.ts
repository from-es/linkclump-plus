/**
 * This module handles the activation of the Linkclump extension based on user settings.
 * It processes the URLs provided in the activation message and dispatches the appropriate action
 * (copying to clipboard, bookmarking, opening in new tabs, or opening in a new window) based on
 */

import { handleBookmark } from "../actions/bookmark";
import { handleCopy } from "../actions/copyToClipboard";
import { handleTab } from "../actions/openNewTabs";
import { handleWin } from "../actions/openNewWin";
import { uniqueUrl } from "../utils/uniqueUrl";

// WXT provided cross-browser Types
import type { Browser } from "wxt/browser";

import type {
	ActivateMessage,
	ActivateMessage_bm,
	ActivateMessage_copy,
	ActivateMessage_tabs,
	ActivateMessage_win
} from "@/assets/js/types/Messages";

/**
 * Preprocesses URLs and dispatches action based on user settings.
 *
 * @param {ActivateMessage} request - Activate message containing URLs and configuration.
 * @param {Browser.runtime.MessageSender} sender - Details of the message sender.
 * @returns {void}
 */
export function handleActivate(request: ActivateMessage, sender: Browser.runtime.MessageSender): void {
	if (request.setting.options.block) {
		request.urls = uniqueUrl(request.urls);
	}

	if (request.urls.length === 0) {
		return;
	}

	if (request.setting.options.reverse) {
		request.urls.reverse();
	}

	switch (request.setting.action) {
		case "copy": {
			handleCopy(request as ActivateMessage<ActivateMessage_copy>);
			break;
		}
		case "bm": {
			handleBookmark(request as ActivateMessage<ActivateMessage_bm>);
			break;
		}
		case "win": {
			handleWin(request as ActivateMessage<ActivateMessage_win>);
			break;
		}
		case "tabs": {
			handleTab(request as ActivateMessage<ActivateMessage_tabs>, sender);
			break;
		}
	}
}

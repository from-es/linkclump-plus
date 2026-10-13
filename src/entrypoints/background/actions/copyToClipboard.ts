// WXT provided cross-browser compatible API
import { browser } from "wxt/browser";

import { CopyFormatType } from "@/assets/js/constants/CopyFormat";

import type {
	ActivateMessage,
	ActivateMessage_copy
} from "@/assets/js/types/Messages";
import type { CopyFormat } from "@/assets/js/types/Settings";

/**
 * Sends a message to the active tab to copy the specified text to clipboard.
 *
 * @param {string} text - Text to copy to clipboard.
 * @returns {void}
 */
export function copyToClipboard(text: string): void {
	const queryInfo: Browser.tabs.QueryInfo = {
		active: true,
		currentWindow: true
	};
	browser.tabs.query(queryInfo)
		.then((tabs) => {
			const tab = tabs[0];
			if (tab?.id) {
				browser.tabs.sendMessage(tab.id, { message: "copyToClipboard", text: text });
			}
		});
}

/**
 * Formats a link item according to the specified copy format.
 *
 * @param {ActivateMessage["urls"][0]} link - Link object containing url and title.
 * @param {CopyFormat} copyFormat - Desired format classification.
 * @returns {string} Formatted string representation of the link.
 */
export function formatLink({ url, title }: ActivateMessage["urls"][0], copyFormat: CopyFormat): string {
	switch (Number(copyFormat)) {
		case CopyFormatType.URLS_WITH_TITLES:
			return `${title}\t${url}\n`;
		case CopyFormatType.URLS_ONLY:
			return `${url}\n`;
		case CopyFormatType.URLS_ONLY_SPACE_SEPARATED:
			return `${url} `;
		case CopyFormatType.TITLES_ONLY:
			return `${title}\n`;
		case CopyFormatType.AS_LINK_HTML:
			return `<a href="${url}">${title}</a>\n`;
		case CopyFormatType.AS_LIST_LINK_HTML:
			return `<li><a href="${url}">${title}</a></li>\n`;
		case CopyFormatType.AS_MARKDOWN:
			return `[${title}](${url})\n`;
		default:
			throw new Error(`Invalid copy format: ${copyFormat}`);
	}
}

/**
 * Handles the copy action by formatting links and sending them to the clipboard.
 *
 * @param {ActivateMessage<ActivateMessage_copy>} request - Activate message for copy action.
 * @returns {void}
 */
export function handleCopy(request: ActivateMessage<ActivateMessage_copy>): void {
	let text = "";
	for (let i = 0; i < request.urls.length; i++) {
		const urlItem = request.urls[i];
		if (!urlItem) {
			continue;
		}

		text += formatLink(urlItem, request.setting.options.copy);
	}

	if (Number(request.setting.options.copy) === CopyFormatType.AS_LIST_LINK_HTML) {
		text = `<ul>\n${text}</ul>\n`;
	}

	copyToClipboard(text);
}

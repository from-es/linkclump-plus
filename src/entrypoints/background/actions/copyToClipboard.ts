// WXT provided cross-browser compatible API and Types
import { browser, type Browser } from "wxt/browser";

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
 * @returns {Promise<void>}
 */
export async function copyToClipboard(text: string): Promise<void> {
	const queryInfo: Browser.tabs.QueryInfo = {
		active: true,
		currentWindow: true
	};
	const tabs = await browser.tabs.query(queryInfo);
	const tab = tabs[0];
	if (tab?.id) {
		await browser.tabs.sendMessage(tab.id, { message: "copyToClipboard", text: text });
	}
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
 * @returns {Promise<void>}
 */
export async function handleCopyToClipboard(request: ActivateMessage<ActivateMessage_copy>): Promise<void> {
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

	await copyToClipboard(text);
}

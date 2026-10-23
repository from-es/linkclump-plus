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
 * Collapses every run of whitespace (including line breaks and tabs) in a link title into a
 * single space and trims both ends, so that a title never breaks the line- or tab-based
 * layout of the copied text.
 *
 * @param {string} title - Link title (innerText of the link).
 * @returns {string} Single-line title.
 */
function normalizeTitle(title: string): string {
	return title.replace(/\s+/g, " ").trim();
}

/**
 * Escapes the characters that are significant in HTML text and in a double-quoted attribute.
 *
 * @param {string} text - Text to embed in HTML.
 * @returns {string} Escaped text.
 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/**
 * Escapes the characters that would end or change the link text of a Markdown link.
 *
 * @param {string} text - Link text.
 * @returns {string} Escaped text.
 */
function escapeMarkdownText(text: string): string {
	return text.replace(/[\\[\]]/g, "\\$&");
}

/**
 * Percent-encodes the characters that would end or change the destination of a Markdown link
 * (parentheses, angle brackets, and whitespace).
 *
 * @param {string} url - Link destination.
 * @returns {string} Encoded destination.
 */
function escapeMarkdownUrl(url: string): string {
	return url.replace(/[()<> \t\r\n]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
}

/**
 * Formats a link item according to the specified copy format.
 *
 * The title is reduced to a single line for every format that contains it. In the HTML and
 * Markdown formats, the title and the URL are also escaped so that the result stays valid.
 *
 * @param {ActivateMessage["urls"][0]} link - Link object containing url and title.
 * @param {CopyFormat} copyFormat - Desired format classification.
 * @returns {string} Formatted string representation of the link.
 */
export function formatLink({ url, title }: ActivateMessage["urls"][0], copyFormat: CopyFormat): string {
	const singleLineTitle = normalizeTitle(title);

	switch (Number(copyFormat)) {
		case CopyFormatType.URLS_WITH_TITLES:
			return `${singleLineTitle}\t${url}\n`;
		case CopyFormatType.URLS_ONLY:
			return `${url}\n`;
		case CopyFormatType.URLS_ONLY_SPACE_SEPARATED:
			return `${url} `;
		case CopyFormatType.TITLES_ONLY:
			return `${singleLineTitle}\n`;
		case CopyFormatType.AS_LINK_HTML:
			return `<a href="${escapeHtml(url)}">${escapeHtml(singleLineTitle)}</a>\n`;
		case CopyFormatType.AS_LIST_LINK_HTML:
			return `<li><a href="${escapeHtml(url)}">${escapeHtml(singleLineTitle)}</a></li>\n`;
		case CopyFormatType.AS_MARKDOWN:
			return `[${escapeMarkdownText(singleLineTitle)}](${escapeMarkdownUrl(url)})\n`;
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

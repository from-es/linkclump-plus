// WXT provided cross-browser compatible API
import { browser } from "wxt/browser";

import { dateFormatter } from "@/assets/js/lib/dateFormatter";
import { detectBrowser } from "@/assets/js/lib/detectBrowser";

import {
	BOOKMARK_CHROME_BAR_ID,
	BOOKMARK_CHROME_OTHER_ID,
	BOOKMARK_FIREFOX_MENU_GUID,
	BOOKMARK_FIREFOX_UNFILED_GUID,
	BROWSER_FIREFOX
} from "@/assets/js/constants/browser";

// WXT provided cross-browser Types
import type { Browser } from "wxt/browser";

import type {
	ActivateMessage,
	ActivateMessage_bm
} from "@/assets/js/types/Messages";

/**
 * Resolves the target parent bookmark folder ID based on browser type and user configuration.
 *
 * @todo Add support for "toolbar" option in the next major version.
 * Next major version type: `type BookmarkOption = "main" | "toolbar" | "other";`
 *
 * @param {Browser.bookmarks.BookmarkTreeNode | undefined} rootNode - Root bookmark tree node.
 * @param {undefined | string | number} bookmarksOption - User-selected bookmark option value.
 * @returns {string | undefined} Resolved parent folder ID or GUID.
 */
export function resolveBookmarkFolderId(
	rootNode: Browser.bookmarks.BookmarkTreeNode | undefined,
	bookmarksOption: undefined | string | number
): string | undefined {
	const normalizeBookmarkOption = (option: undefined | string | number): "main" | "other" => {
		switch (option) {
			// Chrome: Bookmarks Bar / Firefox: Bookmarks Menu
			case 0:
			case "0":
			case "main":
				return "main";
			// Chrome / Firefox: Other Bookmarks
			case 1:
			case "1":
			case "other":
				return "other";
			default:
				// For any other value, including undefined, default to "main"
				return "main";
		}
	};

	const target = normalizeBookmarkOption(bookmarksOption);

	if (detectBrowser() === BROWSER_FIREFOX) {
		const targetGuid = target === "main"
			? BOOKMARK_FIREFOX_MENU_GUID
			: BOOKMARK_FIREFOX_UNFILED_GUID;
		return rootNode?.children?.find((node) => node.id === targetGuid)?.id ?? targetGuid;
	}

	const targetId = target === "main" ? BOOKMARK_CHROME_BAR_ID : BOOKMARK_CHROME_OTHER_ID;
	const targetIndex = target === "main" ? 0 : 1;
	return rootNode?.children?.find((node) => node.id === targetId)?.id ?? rootNode?.children?.[targetIndex]?.id ?? targetId;
}

/**
 * Handles the bookmark action by creating a timestamped folder and saving links into it.
 *
 * @param {ActivateMessage<ActivateMessage_bm>} request - Activate message for bookmark action.
 * @returns {Promise<void>} Promise resolving when bookmarks creation is completed.
 */
export async function handleBookmark(request: ActivateMessage<ActivateMessage_bm>): Promise<void> {
	const bookmarkTreeNodes = await browser.bookmarks.getTree();
	const rootNode = bookmarkTreeNodes[0];
	const folderID = resolveBookmarkFolderId(rootNode, request.setting.options?.bookmarks);

	if (!folderID) {
		console.error("Target bookmark folder ID is undefined.");
		return;
	}

	const dateFormat = "YYYY-MM-DD HH:mm:ss";
	const dateString = dateFormatter(new Date(), dateFormat);
	const dirName = `Linkclump ${dateString}`;

	let newFolder: Browser.bookmarks.BookmarkTreeNode;
	try {
		newFolder = await browser.bookmarks.create({
			"parentId": folderID,
			"title": dirName
		});
	} catch (error) {
		console.error("Failed to create bookmark folder:", error);
		return;
	}

	if (!newFolder?.id) {
		console.error("Created bookmark folder ID is undefined:", newFolder);
		return;
	}

	for (let j = 0; j < request.urls.length; j++) {
		const urlItem = request.urls[j];
		if (!urlItem) {
			continue;
		}

		try {
			await browser.bookmarks.create({
				"parentId": newFolder.id,
				"title": urlItem.title,
				"url": urlItem.url
			});
		} catch (error) {
			console.error(`Failed to add bookmark: ${urlItem.url}`, error);
		}
	}
}

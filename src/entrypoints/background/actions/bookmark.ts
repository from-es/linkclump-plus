// WXT provided cross-browser compatible API
import { browser } from "wxt/browser";

import { dateFormatter } from "@/assets/js/lib/dateFormatter";
import { detectBrowser } from "@/assets/js/lib/detectBrowser";

import {
	BOOKMARK_CHROME_BAR_ID,
	BOOKMARK_CHROME_OTHER_ID,
	BOOKMARK_FIREFOX_MENU_GUID,
	BOOKMARK_FIREFOX_UNFILED_GUID,
	BOOKMARK_PARENT_FOLDER_FALLBACK_NAME,
	BOOKMARK_CREATION_LOCK_NAME,
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
 * Resolves the parent bookmark folder name dynamically from the extension manifest.
 *
 * @returns {string} Trimmed manifest name, or fallback constant if unavailable.
 */
export function resolveParentFolderName(): string {
	const manifestName = browser.runtime.getManifest().name?.trim();
	return manifestName || BOOKMARK_PARENT_FOLDER_FALLBACK_NAME;
}

/**
 * Determines whether the given bookmark tree node represents a folder.
 * Excludes separators and nodes with URL.
 *
 * @param {Browser.bookmarks.BookmarkTreeNode} node - The bookmark tree node to check.
 * @returns {boolean} True if the node is a bookmark folder.
 */
export function isBookmarkFolder(node: Browser.bookmarks.BookmarkTreeNode): boolean {
	const nodeWithType = node as Browser.bookmarks.BookmarkTreeNode & { type?: string };
	return typeof node.url === "undefined" && nodeWithType.type !== "separator";
}

/**
 * Finds an existing bookmark folder by title under a specified parent folder.
 *
 * @param {string} parentId - ID of the parent folder to search within.
 * @param {string} title - Folder title to search for.
 * @returns {Promise<Browser.bookmarks.BookmarkTreeNode | undefined>} Found folder node, or undefined.
 */
export async function findBookmarkFolder(
	parentId: string,
	title: string
): Promise<Browser.bookmarks.BookmarkTreeNode | undefined> {
	const children = await browser.bookmarks.getChildren(parentId);
	return children.find((node) => node.title === title && isBookmarkFolder(node));
}

/**
 * Searches for or creates the extension parent bookmark folder under the specified root.
 *
 * @param {string} rootFolderId - ID of the root folder (e.g. bookmarks bar or other bookmarks).
 * @returns {Promise<string | undefined>} Resolved parent folder ID, or undefined on unrecoverable failure.
 */
export async function getOrCreateParentBookmarkFolder(rootFolderId: string): Promise<string | undefined> {
	const parentTitle = resolveParentFolderName();
	const defaultRootId = detectBrowser() === BROWSER_FIREFOX ? BOOKMARK_FIREFOX_MENU_GUID : BOOKMARK_CHROME_BAR_ID;

	const findOrCreate = async (targetId: string): Promise<string | undefined> => {
		const existingFolder = await findBookmarkFolder(targetId, parentTitle);
		if (existingFolder) {
			return existingFolder.id;
		}

		const created = await browser.bookmarks.create({
			"parentId": targetId,
			"title": parentTitle
		});
		return created.id;
	};

	try {
		return await findOrCreate(rootFolderId);
	} catch (primaryError) {
		// If already the default root, do not attempt to fallback to the same ID
		if (rootFolderId === defaultRootId) {
			console.error("Failed to find or create parent bookmark folder under default root:", primaryError);
			return undefined;
		}

		console.warn("Failed to find or create parent bookmark folder under target root, falling back to default root:", {
			rootFolderId,
			defaultRootId,
			"error": primaryError
		});

		try {
			return await findOrCreate(defaultRootId);
		} catch (fallbackError) {
			console.error("Failed to find or create parent bookmark folder under fallback root:", fallbackError);
			return undefined;
		}
	}
}

/**
 * Gets or creates a timestamped subfolder under the parent bookmark folder.
 * If a subfolder with the same timestamp already exists under the parent folder,
 * the existing subfolder is reused to group links saved within the same second.
 * New subfolders are inserted at the beginning (index 0) to maintain a reverse chronological order (new -> old).
 *
 * @param {string} parentFolderId - ID of the parent folder.
 * @param {Date} [initialDate] - Initial date for generating folder title (defaults to new Date()).
 * @returns {Promise<Browser.bookmarks.BookmarkTreeNode | undefined>} Created or existing node, or undefined on failure.
 */
export async function getOrCreateSubBookmarkFolder(
	parentFolderId: string,
	initialDate: Date = new Date()
): Promise<Browser.bookmarks.BookmarkTreeNode | undefined> {
	const dateFormat = "YYYY-MM-DD HH:mm:ss";
	const dirName = dateFormatter(initialDate, dateFormat);

	try {
		const existingFolder = await findBookmarkFolder(parentFolderId, dirName);
		if (existingFolder) {
			return existingFolder;
		}

		return await browser.bookmarks.create({
			"parentId": parentFolderId,
			"title": dirName,
			"index": 0  // Insert at the beginning to maintain reverse chronological order
		});
	} catch (error) {
		console.error("Failed to create timestamped bookmark subfolder:", error);
		return undefined;
	}
}

export const createSubBookmarkFolder = getOrCreateSubBookmarkFolder;

/**
 * Sequentially creates bookmark items in the target folder for each provided URL.
 *
 * @param {string} targetFolderId - ID of the folder to save bookmarks into.
 * @param {{ url: string; title: string }[]} urls - Array of URL items to bookmark.
 * @returns {Promise<void>}
 */
export async function saveBookmarkItems(
	targetFolderId: string,
	urls: { url: string; title: string }[]
): Promise<void> {
	for (let j = 0; j < urls.length; j++) {
		const urlItem = urls[j];
		if (!urlItem) {
			continue;
		}

		try {
			await browser.bookmarks.create({
				"parentId": targetFolderId,
				"title": urlItem.title,
				"url": urlItem.url
			});
		} catch (error) {
			console.error(`Failed to add bookmark: ${urlItem.url}`, error);
		}
	}
}

/**
 * Processes the bookmark action sequence (resolving root, creating folders, and saving links).
 * Designed to be executed inside a serialized Web Locks callback.
 *
 * @param {ActivateMessage<ActivateMessage_bm>} request - Activate message containing URLs and bookmark settings.
 * @returns {Promise<void>} Promise resolving when bookmark processing completes.
 */
export async function processBookmarkAction(request: ActivateMessage<ActivateMessage_bm>): Promise<void> {
	const bookmarkTreeNodes = await browser.bookmarks.getTree();
	const rootNode = bookmarkTreeNodes[0];
	const folderID = resolveBookmarkFolderId(rootNode, request.setting.options?.bookmarks);

	if (!folderID) {
		console.error("Target bookmark folder ID is undefined.");
		return;
	}

	const parentFolderId = await getOrCreateParentBookmarkFolder(folderID);
	if (!parentFolderId) {
		console.error("Target bookmark parent folder ID is undefined.");
		return;
	}

	const subFolder = await getOrCreateSubBookmarkFolder(parentFolderId);
	if (!subFolder?.id) {
		console.error("Created bookmark folder ID is undefined:", subFolder);
		return;
	}

	await saveBookmarkItems(subFolder.id, request.urls);
}

/**
 * Handles the bookmark action by serializing the entire bookmark sequence via Web Locks.
 *
 * @param {ActivateMessage<ActivateMessage_bm>} request - Activate message for bookmark action.
 * @returns {Promise<void>} Promise resolving when bookmarks creation is completed.
 */
export async function handleBookmark(request: ActivateMessage<ActivateMessage_bm>): Promise<void> {
	try {
		// Serialize the entire bookmark sequence: parent folder resolution, subfolder creation, and link saving
		await navigator.locks.request(
			BOOKMARK_CREATION_LOCK_NAME,
			() => processBookmarkAction(request)
		);
	} catch (error) {
		console.error("Failed to process bookmark action:", error);
	}
}

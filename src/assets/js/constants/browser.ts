import type { BrowserType } from "@/assets/js/types/Browser";

/**
 * Browser classification constants used for browser-specific behavior branching.
 */
export const BROWSER_CHROME = "chrome" as const satisfies BrowserType;
export const BROWSER_FIREFOX = "firefox" as const satisfies BrowserType;
export const BROWSER_OTHER = "other" as const satisfies BrowserType;

// Exhaustive check: verify that all values of union BrowserType are covered by BROWSER_* constants
type _Exhaustive = BrowserType extends typeof BROWSER_CHROME | typeof BROWSER_FIREFOX | typeof BROWSER_OTHER ? true : never;
const _check: _Exhaustive = true;
void _check;

/**
 * Chromium permanent bookmark folder IDs.
 *
 * Note: Google Chrome does not distinguish between a bookmarks menu and a toolbar; the Bookmarks Bar ("1") serves as the primary location.
 *
 * @see {@link https://source.chromium.org/chromium/chromium/src/+/main:components/bookmarks/browser/bookmark_model.cc|BookmarkModel - Chromium}
 */
export const BOOKMARK_CHROME_BAR_ID = "1" as const;
export const BOOKMARK_CHROME_OTHER_ID = "2" as const;

/**
 * Firefox Places specific root bookmark folder GUIDs.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/bookmarks/BookmarkTreeNode|BookmarkTreeNode - MDN}
 */
export const BOOKMARK_FIREFOX_MENU_GUID = "menu________" as const;
export const BOOKMARK_FIREFOX_UNFILED_GUID = "unfiled_____" as const;
export const BOOKMARK_FIREFOX_TOOLBAR_GUID = "toolbar_____" as const;

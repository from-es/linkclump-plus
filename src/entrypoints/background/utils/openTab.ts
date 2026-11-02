// WXT provided cross-browser compatible API and Types
import { browser, type Browser } from "wxt/browser";

import { safeAsync } from "@/assets/js/lib/safeAsync";

/**
 * Recursively opens tabs with an optional delay and automatic closing timer.
 *
 * @param {{ url: string, title: string }[]} urls - Array of link objects to open.
 * @param {number} delay - Delay in milliseconds between opening tabs.
 * @param {number} [windowId] - ID of the target window.
 * @param {number} [openerTabId] - ID of the opener tab.
 * @param {number | null} [tabIndex] - Target tab index within the window.
 * @param {number} [closeTime] - Auto-close duration in milliseconds.
 * @returns {void}
 */
export function openTab(
	urls: { url: string, title: string }[],
	delay: number,
	windowId?: number,
	openerTabId?: number,
	tabIndex?: number | null,
	closeTime?: number
): void {
	const url = urls.shift()?.url;

	// An entry without a URL (or an empty list) opens nothing. Skip delay and carry on with
	// the rest immediately, or stop when there is nothing left: otherwise the function would
	// schedule itself forever and open a blank tab every time.
	if (!url) {
		if (urls.length > 0) {
			openTab(urls, delay, windowId, openerTabId, tabIndex, closeTime);
		}
		return;
	}

	// The current entry has a valid URL. If subsequent links remain to be processed, schedule
	// the next tab creation after the specified delay interval.
	if (urls.length > 0) {
		setTimeout(
			() => {
				openTab(urls, delay, windowId, openerTabId, tabIndex, closeTime);
			},
			delay
		);
	}

	const obj = {
		windowId,
		url: url,
		active: false
	} as Browser.tabs.CreateProperties;

	// only add tab ID if delay feature is not being used as if tab with openerTabId is closed, the links stop opening
	if (!delay) {
		obj.openerTabId = openerTabId;
	}

	if (typeof tabIndex === "number" && Number.isSafeInteger(tabIndex) && tabIndex >= 0) {
		obj.index = tabIndex;
		tabIndex++;
	}

	safeAsync(
		"openTab",
		async () => {
			const tab = await browser.tabs.create(obj);

			if (closeTime && closeTime > 0) {
				setTimeout(
					() => {
						if (tab.id) {
							browser.tabs.remove(tab.id).catch((error: unknown) => {
								console.debug("Failed to remove auto-closing tab:", { tabId: tab.id, error });
							});
						}
					},
					closeTime
				);
			}
		},
		"background"
	);
}

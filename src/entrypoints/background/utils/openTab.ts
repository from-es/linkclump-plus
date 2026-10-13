// WXT provided cross-browser compatible API
import { browser } from "wxt/browser";

import { SECONDS_TO_MS } from "@/assets/js/constants/timing";

// WXT provided cross-browser Types
import type { Browser } from "wxt/browser";

/**
 * Recursively opens tabs with an optional delay and automatic closing timer.
 *
 * @param {{ url: string, title: string }[]} urls - Array of link objects to open.
 * @param {number} delay - Delay in seconds between opening tabs.
 * @param {number} [windowId] - ID of the target window.
 * @param {number} [openerTabId] - ID of the opener tab.
 * @param {number | null} [tabIndex] - Target tab index within the window.
 * @param {number} [closeTime] - Auto-close duration in seconds.
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

	if (!url || urls.length > 0) {
		setTimeout(
			function () {
				openTab(urls, delay, windowId, openerTabId, tabIndex, closeTime);
			},
			delay * SECONDS_TO_MS
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

	browser.tabs.create(obj).then((tab) => {
		if (closeTime && closeTime > 0) {
			setTimeout(function () {
				if (tab.id) {
					browser.tabs.remove(tab.id);
				}
			}, closeTime * SECONDS_TO_MS);
		}
	});
}

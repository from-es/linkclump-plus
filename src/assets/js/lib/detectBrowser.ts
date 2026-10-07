import { browser } from "wxt/browser";

import {
	BROWSER_CHROME,
	BROWSER_FIREFOX,
	BROWSER_OTHER
} from "@/assets/js/constants/browser";

import type { BrowserType } from "@/assets/js/types/Browser";



interface NavigatorUAData {
	brands?: Array<{ brand: string; version: string }>;
}

/**
 * Detects the client browser environment using a multi-layer strategy:
 * 1. Extension package manifest structure (`browser_specific_settings` in Firefox vs Chrome).
 * 2. User-Agent Client Hints (`navigator.userAgentData`) for modern Chromium browsers.
 * 3. Fallback to `navigator.userAgent`.
 *
 * @returns {BrowserType} BROWSER_CHROME, BROWSER_FIREFOX, or BROWSER_OTHER.
 */
export function detectBrowser(): BrowserType {
	// Layer 1: Manifest property check (Tamper-proof signal from extension package)
	try {
		const manifest = browser.runtime.getManifest() as Record<string, unknown>;
		if ("browser_specific_settings" in manifest && manifest.browser_specific_settings !== undefined) {
			return BROWSER_FIREFOX;
		}
	} catch {
		// Fallback if manifest is unavailable
	}

	// Layer 2: User-Agent Client Hints (Chromium modern API)
	if (typeof navigator !== "undefined") {
		const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;
		if (uaData?.brands?.some((b) => b.brand.includes("Chromium") || b.brand.includes("Google Chrome"))) {
			return BROWSER_CHROME;
		}

		// Layer 3: Legacy navigator.userAgent string check
		const ua = navigator.userAgent;
		if (ua.includes("Firefox")) {
			return BROWSER_FIREFOX;
		}
		if (ua.includes("Chrome")) {
			return BROWSER_CHROME;
		}
	}

	return BROWSER_OTHER;
}

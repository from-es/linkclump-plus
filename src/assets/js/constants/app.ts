// WXT provided cross-browser compatible API.
import { browser } from "wxt/browser";

const manifest = browser.runtime.getManifest();
const appName = manifest.name;

/**
 * Static application metadata, store URLs, and repository links.
 */
export const Information = {
	// Basic application information
	name       : appName,
	description: manifest.description ?? "",
	version    : manifest.version,

	// Code management & support
	github: {
		title : `${appName} - GitHub`,
		url   : "https://github.com/from-es/linkclump-plus",
		issues: "https://github.com/from-es/linkclump-plus/issues"
	},

	// Official website & documentation
	website: {
		title: `${appName} Official Site`,
		url  : "https://github.com/from-es/linkclump-plus#readme"  // Use the GitHub README as the temporary landing page, for example
	},

	// Browser extension stores
	stores: {
		chrome: {
			title  : `${appName} - Chrome Web Store`,
			url    : "https://chromewebstore.google.com/detail/linkclump-plus/ainlglbojoodfdbndbfofojhmjbmelmm",
			reviews: "https://chromewebstore.google.com/detail/linkclump-plus/ainlglbojoodfdbndbfofojhmjbmelmm/reviews",
			publish: 2024  // Year the extension was published
		},
		firefox: {
			title  : `${appName} - Firefox Add-ons`,
			url    : "https://addons.mozilla.org/firefox/addon/linkclump-plus/",
			reviews: "https://addons.mozilla.org/firefox/addon/linkclump-plus/reviews/",
			publish: 2026  // Year the extension was published
		},
	},

} as const;

export type Information = typeof Information;

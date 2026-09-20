// WXT provided cross-browser compatible Types.
import type { UserManifest } from "wxt";

// Import Object
import pkg from "../package.json";

export const manifest: UserManifest = {
	/**
	 * WXT manages the manifest version internally, so specifying it here has no effect
	 * and causes a build-time warning. To change the manifest version, use the
	 * `manifestVersion` option in wxt.config.ts or the `--mv2/--mv3` CLI flags instead.
	 *
	 * @see {@link https://wxt.dev/guide/essentials/target-different-browsers.html#target-a-manifest-version|Target a Manifest Version - WXT}
	 */
	// "manifest_version": 3,

	"name": "Linkclump Plus",
	"description": "Lets you open, copy or bookmark multiple links at the same time.",

	// Obtained from package.json
	"version": pkg.version,

	"icons": {
		"16": "img/icon_16.png",
		"32": "img/icon_32.png",
		"48": "img/icon_48.png",
		"128": "img/icon_128.png"
	},
	"action": {},
	"permissions": [
		"tabs",
		"bookmarks",
		"storage",
		"clipboardWrite",
		"scripting"
	],
	"host_permissions": [
		"*://*/*"
	],
	/*
		CSS
			:has() (https://developer.mozilla.org/en-US/docs/Web/CSS/:has)
				- Chrome : 105 & later
				- Firefox: 121 & later
			CSS Nesting (https://caniuse.com/css-nesting)
				- Chrome : 120 & later
				- Firefox: 117 & later
			field-sizing (https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/field-sizing)
				- Chrome : 123 & later
				- Firefox: 152 & later
		JavaScript
			Popover API (https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)
				- Chrome : 114 & later
				- Firefox: 125 & later
			URL.canParse() (https://developer.mozilla.org/en-US/docs/Web/API/URL/canParse_static)
				- Chrome : 120 & later
				- Firefox: 115 & later
			Error: cause (https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause)
				- Chrome : 125 & later
				- Firefox:  91 & later
			Clipboard API: ClipboardItem (https://developer.mozilla.org/en-US/docs/Web/API/ClipboardItem)
				- Chrome :  76 & later
				- Firefox: 127 & later
		Firefox Add-ons Store
			data_collection_permissions (https://extensionworkshop.com/documentation/develop/best-practices-for-collecting-user-data-consents/)
				- Firefox (Desktop): 140 & later
				- Firefox (Android): 142 & later
	*/
	// for Google Chrome or Chromium-based browsers
	"minimum_chrome_version": "125",

	// for Mozilla Firefox or Firefox-based browsers
	"browser_specific_settings": {
		"gecko": {
			"id": "{bfa63657-ac46-47eb-acfd-27f8e374bc0e}",
			"strict_min_version": "152.0",

			/**
			 * Data collection permissions for Firefox
			 *
			 * @see {@link https://extensionworkshop.com/documentation/develop/best-practices-for-collecting-user-data-consents/|Data Collection Permissions - Extension Workshop}
			 */
			"data_collection_permissions": {
				"required": [ "none" ]
			}
		}
	},
	"background": {
		"service_worker": "/background.js",
		"type": "module"
	},
	"content_scripts": [
		{
			"matches": [
				"<all_urls>"
			],
			"all_frames": true,
			"run_at": "document_idle",
			"js": [
				"/content-scripts/content.js"
			]
		}
	],
	"options_ui": {
		"open_in_tab": true,
		"page": "/options.html"
	}
};

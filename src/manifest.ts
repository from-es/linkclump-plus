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
		"clipboardWrite"
	],
	"host_permissions": [
		"*://*/*"
	],
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

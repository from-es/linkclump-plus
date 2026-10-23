// WXT provided cross-browser compatible API
import { browser } from "wxt/browser";

import { safeAsync } from "@/assets/js/lib/safeAsync";
import { initBackground } from "./init/initBackground";
import { handleRequests } from "./messaging/handleRequests";
import { ContentScriptManager } from "./scripts/ContentScriptManager";
import { SettingsManager } from "./settings/SettingsManager";
import { StorageManager } from "./settings/StorageManager";

import type { Deps } from "./deps";
import type { Messages } from "@/assets/js/types/Messages";

// Instances are created here and passed to the handlers
const storageManager = new StorageManager();
const settingsManager = new SettingsManager(storageManager);
const contentScriptManager = new ContentScriptManager(settingsManager);

const deps: Deps = {
	settingsManager,
	contentScriptManager
};

/**
 * Initializes listeners and invokes background startup tasks.
 *
 * @returns {void}
 */
function main(): void {
	browser.runtime.onMessage.addListener((request: Messages, sender, sendResponse) => handleRequests(request, sender, sendResponse, deps));

	browser.action.onClicked.addListener(() => {
		safeAsync("openOptionsPage", () => browser.runtime.openOptionsPage(), "background");
	});

	safeAsync("initBackground", () => initBackground(deps), "background");
}

export default defineBackground(
	// Executed when background is loaded, cannot be async
	main
);

// WXT provided cross-browser compatible API
import { browser } from "wxt/browser";

import { initBackground } from "./init/initBackground";
import { handleRequests } from "./messaging/handleRequests";

/**
 * Initializes listeners and invokes background startup tasks.
 *
 * @returns {void}
 */
function main(): void {
	browser.runtime.onMessage.addListener(handleRequests);

	browser.action.onClicked.addListener(() => {
		browser.runtime.openOptionsPage();
	});

	initBackground();
}

export default defineBackground(
	// Executed when background is loaded, cannot be async
	main
);

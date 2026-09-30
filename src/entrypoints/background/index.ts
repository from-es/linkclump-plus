import { browser, type Browser } from "wxt/browser";

import { CopyFormatType } from "@/assets/js/constants/CopyFormat";
import { MOUSE_BUTTON_LEFT } from "@/assets/js/constants/mouseButton";
import { KEY_CODE_DEFAULT_Z } from "@/assets/js/constants/keyboard";
import {
	SMART_SELECT_ON,
	FILTER_EXCLUDE_LINKS,
	BOOKMARK_OTHER_DEFAULT_INDEX
} from "@/assets/js/constants/action";
import {
	COUNTER_FONT_SIZE_DEFAULT,
	COUNTER_FONT_WEIGHT_DEFAULT
} from "@/assets/js/constants/ui";
import {
	OPTIONS_WINDOW_DEFAULT_WIDTH,
	OPTIONS_WINDOW_DEFAULT_HEIGHT,
	OPTIONS_WINDOW_CENTER_OFFSET_X,
	OPTIONS_WINDOW_CENTER_OFFSET_Y
} from "@/assets/js/constants/window";
import { SECONDS_TO_MS } from "@/assets/js/constants/timing";
import { isSettings } from "@/assets/js/lib/SettingsGuard";

import type {
	ActivateMessage,
	ActivateMessage_bm,
	ActivateMessage_copy,
	ActivateMessage_tabs,
	ActivateMessage_win,
	Messages,
	UpdateMessage
} from "@/assets/js/types/Messages";
import type {
	CopyFormat,
	Settings
} from "@/assets/js/types/Settings";



// Format version
const CURRENT_VERSION = "5";

// key name for Stroage
const linkclumpSettingsKey = "linkclumpSettings";
const linkclumpVersionKey = "linkclumpVersion";

class SettingsManager {

	async load(): Promise<Settings> {
		const result = await browser.storage.sync.get(linkclumpSettingsKey);
		const settings = result[linkclumpSettingsKey];

		if (isSettings(settings)) {
			return settings;
		}

		return await this.init();
	};

	async save(settings: Settings & { error?: string }) {
		// remove any error messages from object (shouldn't be there)
		if (settings.error !== undefined) {
			delete settings.error;
		}

		await browser.storage.sync.set({ [linkclumpSettingsKey]: settings });
	};

	async isInit() {
		const { [linkclumpVersionKey]: version } = await browser.storage.sync.get(linkclumpVersionKey);
		return version !== undefined;
	};

	async isLatest() {
		const { [linkclumpVersionKey]: version } = await browser.storage.sync.get(linkclumpVersionKey);
		return version === CURRENT_VERSION;
	};

	async init() {
		// create default settings for first time user
		const settings: Settings = {
			"actions": {
				"101": {
					"mouse": MOUSE_BUTTON_LEFT,  // left mouse button
					"key": KEY_CODE_DEFAULT_Z,   // z key
					"action": "tabs",
					"color": "#FFA500",
					"options": {
						"smart": SMART_SELECT_ON,
						"ignore": [ FILTER_EXCLUDE_LINKS ],
						"delay": 0,
						"close": 0,
						"block": true,
						"reverse": false,
						"end": false,
						"fontsizeofcounter": COUNTER_FONT_SIZE_DEFAULT,
						"fontweightofcounter": COUNTER_FONT_WEIGHT_DEFAULT,
						"samebgcolorasbox": true // If you want to set the color of counter to the same as the box color, specify a value of true
					}
				}
			},
			"blocked": []
		};

		// save settings to store
		await browser.storage.sync.set({ [linkclumpSettingsKey]: settings });
		await browser.storage.sync.set({ [linkclumpVersionKey]: CURRENT_VERSION });

		return settings;
	};


	async update() {
		if (!(await this.isInit())) {
			await this.init();
		}
	};
}

const settingsManager = new SettingsManager();



export default defineBackground(
	main
);



function main() {
	browser.runtime.onMessage.addListener(handleRequests);

	browser.action.onClicked.addListener(() => {
		browser.runtime.openOptionsPage();
	});

	initBackground();
}

async function initBackground() {
	if (!(await settingsManager.isInit())) {
		// initialize settings manager with defaults and to stop this appearing again
		await settingsManager.init();

		// inject Linkclump into windows currently open to make it just work
		const windows = await browser.windows.getAll({ populate: true });
		for (let i = 0; i < windows.length; ++i) {
			const win = windows[i];
			if (!win) {
				continue;
			}
			const numberOfTabs = win.tabs?.length;
			if (numberOfTabs === undefined) {
				continue;
			}
			for (let j = 0; j < numberOfTabs; ++j) {
				const tab = win.tabs?.[j];
				const url = tab?.url;
				const id = tab?.id;
				if (!url || !id) {
					continue;
				}
				if (!/^https?:\/\//.test(url)) {
					continue;
				}
				browser.scripting.executeScript({
					target: { tabId: id },
					files: [ "/content-scripts/content.js" ]
				}).catch((error) => {
					console.warn("Failed to inject content script into tab:", { id, url, error });
				});
			}
		}

		// pop up window to show tour and options page
		const windowOptions: {
			url: string;
			width: number;
			height: number;
			left?: number;
			top?: number;
		} = {
			url: browser.runtime.getURL("/options.html?init=true"),
			width: OPTIONS_WINDOW_DEFAULT_WIDTH,
			height: OPTIONS_WINDOW_DEFAULT_HEIGHT
		};
		if (typeof screen !== "undefined" && screen.width && screen.height) {
			windowOptions.left = Math.round(screen.width / 2 - OPTIONS_WINDOW_CENTER_OFFSET_X / 2);
			windowOptions.top = Math.round(screen.height / 2 - OPTIONS_WINDOW_CENTER_OFFSET_Y / 2);
		}
		browser.windows.create(windowOptions);
	} else if (!(await settingsManager.isLatest())) {
		await settingsManager.update();
	}
}

function uniqueUrl<T extends { url: string }>(arr: T[]): T[] {
	const checklist = new Set<string>();
	const unique = arr.filter(
		(obj) => {
			if (checklist.has(obj.url)) {
				return false;
			} else {
				checklist.add(obj.url);
			}

			return true;
		}
	);

	return unique;
};

function openTab(
	urls: { url: string, title: string }[],
	delay: number,
	windowId?: number,
	openerTabId?: number,
	tabIndex?: number | null,
	closeTime?: number
) {

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

/**
 *
 * @param {string} text - Text to copy to clipboard
 */
function copyToClipboard(text: string): void {
	browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
		const tab = tabs[0];
		if (tab?.id) {
			browser.tabs.sendMessage(tab.id, { message: "copyToClipboard", text: text });
		}
	});
}

function pad(number: number, length: number): string {
	let str = "" + number;
	while (str.length < length) {
		str = "0" + str;
	}

	return str;
}

function timeConverter(a: Date): string {
	const year = a.getFullYear();
	const month = pad(a.getMonth() + 1, 2);
	const day = pad(a.getDate(), 2);
	const hour = pad(a.getHours(), 2);
	const min = pad(a.getMinutes(), 2);
	const sec = pad(a.getSeconds(), 2);
	const time = `${year}-${month}-${day} ${hour}:${min}:${sec}`;
	return time;
}

function formatLink({ url, title }: ActivateMessage["urls"][0], copyFormat: CopyFormat): string {
	switch (Number(copyFormat)) {
		case CopyFormatType.URLS_WITH_TITLES:
			return `${title}\t${url}\n`;
		case CopyFormatType.URLS_ONLY:
			return `${url}\n`;
		case CopyFormatType.URLS_ONLY_SPACE_SEPARATED:
			return `${url} `;
		case CopyFormatType.TITLES_ONLY:
			return `${title}\n`;
		case CopyFormatType.AS_LINK_HTML:
			return `<a href="${url}">${title}</a>\n`;
		case CopyFormatType.AS_LIST_LINK_HTML:
			return `<li><a href="${url}">${title}</a></li>\n`;
		case CopyFormatType.AS_MARKDOWN:
			return `[${title}](${url})\n`;
		default:
			throw new Error(`Invalid copy format: ${copyFormat}`);
	}
}

function handleCopy(request: ActivateMessage<ActivateMessage_copy>): void {
	let text = "";
	for (let i = 0; i < request.urls.length; i++) {
		const urlItem = request.urls[i];
		if (!urlItem) {
			continue;
		}
		text += formatLink(urlItem, request.setting.options.copy);
	}

	if (Number(request.setting.options.copy) === CopyFormatType.AS_LIST_LINK_HTML) {
		text = `<ul>\n${text}</ul>\n`;
	}

	copyToClipboard(text);
}

async function handleBookmark(request: ActivateMessage<ActivateMessage_bm>) {
	const bookmarkTreeNodes = await browser.bookmarks.getTree();
	const selectBookmarks = (bookmarks: undefined | string | number): number => {
		const regex = /^([0-9]+)$/;
		const defaultValue = BOOKMARK_OTHER_DEFAULT_INDEX; // Other Bookmarks: bookmarkTreeNodes[0].children.[1];
		let index: number;

		if (!bookmarks) {
			// Applies if the setting has not been saved in Version 2.13 or later.
			// This maintains compatibility with the behavior of adding to "Other Bookmarks" until version 2.12.4.2 or earlier.
			index = defaultValue;
		} else if (typeof bookmarks === "number" && Number.isSafeInteger(bookmarks)) {
			index = bookmarks;
		} else if (typeof bookmarks === "string" && regex.test(bookmarks)) {
			index = Number.parseInt(bookmarks, 10);
		} else {
			console.warn("Invalid bookmarks option value:", { typeof: bookmarks, value: bookmarks });

			index = defaultValue;
		}

		if (!(index === 0 || index === 1)) {
			index = defaultValue;
		}

		return index;
	};

	// request.setting.options.bookmarks
	//   undefined : This key does not exist until 2.12.4.2 or earlier
	//     0 or "0"  : main   bookmarks
	//     1 or "1"  : other  bookmarks >> Default designation until 2.12.4.2 or earlier
	//     2 or "2"  : synced bookmarks
	const bookmarksIndex: number = selectBookmarks(request.setting.options?.bookmarks);
	const rootNode = bookmarkTreeNodes[0];
	const folderID = rootNode?.children?.[bookmarksIndex]?.id;

	if (!folderID) {
		console.error("Target bookmark folder ID is undefined.");
		return;
	}

	// make assumption that bookmarkTreeNodes[0].children[1] refers to the "other bookmarks" folder
	// as different languages will not use the english name to refer to the folder
	const newFolder = await browser.bookmarks.create({
		"parentId": folderID,
		"title": "Linkclump " + timeConverter(new Date())
	});

	for (let j = 0; j < request.urls.length; j++) {
		const urlItem = request.urls[j];
		if (!urlItem) {
			continue;
		}
		await browser.bookmarks.create({
			"parentId": newFolder.id,
			"title": urlItem.title,
			"url": urlItem.url
		});
	}
}

async function handleWin(request: ActivateMessage<ActivateMessage_win>) {
	const currentWindow = await browser.windows.getCurrent();
	const url = request.urls.shift()?.url;

	if (!url) {
		return;
	}

	const window = await browser.windows.create({
		url: url,
		"focused": !request.setting.options.unfocus
	});

	const windowId = window ? window.id : currentWindow.id;

	if (request.urls.length > 0) {
		openTab(
			request.urls,
			request.setting.options.delay,
			windowId,
			undefined,
			undefined,
			0
		);
	}

	if (currentWindow.id && request.setting.options.unfocus) {
		await browser.windows.update(
			currentWindow.id,
			{ "focused": true }
		);
	}
}

async function handleTab(request: ActivateMessage<ActivateMessage_tabs>, sender: Browser.runtime.MessageSender) {
	if (sender.tab === undefined || sender.tab.id === undefined) {
		return;
	}

	const tab = await browser.tabs.get(sender.tab.id);
	const currentWindow = await browser.windows.getCurrent();
	let tab_index = null;

	if (!request.setting.options.end) {
		tab_index = tab.index + 1;
	}

	const windowId = currentWindow ? currentWindow.id : undefined;

	openTab(
		request.urls,
		request.setting.options.delay,
		windowId,
		tab.id,
		tab_index,
		request.setting.options.close
	);
}

function handleRequests(request: Messages, sender: Browser.runtime.MessageSender): Promise<Settings> | void {
	switch (request.message) {
		case "activate": {
			if (request.setting.options.block) {
				request.urls = uniqueUrl(request.urls);
			}

			if (request.urls.length === 0) {
				return;
			}

			if (request.setting.options.reverse) {
				request.urls.reverse();
			}

			switch (request.setting.action) {
				case "copy": {
					handleCopy(request as ActivateMessage<ActivateMessage_copy>);
					break;
				}
				case "bm": {
					handleBookmark(request as ActivateMessage<ActivateMessage_bm>);
					break;
				}

				case "win": {
					handleWin(request as ActivateMessage<ActivateMessage_win>);
					break;
				}

				case "tabs": {
					handleTab(request as ActivateMessage<ActivateMessage_tabs>, sender);
					break;
				}
			}

			break;
		}

		case "init": {
			return settingsManager.load();
		}
		case "update": {
			settingsManager.save(request.settings).then(async () => {
				const windowList = await browser.windows.getAll({
					populate: true
				});
				const currentSettings = await settingsManager.load();
				windowList.forEach(function (window) {
					if (!window.tabs) {
						return;
					}

					window.tabs.forEach(function (tab) {
						if (!(tab?.id && tab?.url)) {
							return;
						}

						const regex = /^(file|https?):\/\//i;
						if (!regex.test(tab.url)) {
							return;
						}

						const sendMessageToTab = browser.tabs.sendMessage(
							tab.id,
							{
								message: "update",
								settings: currentSettings
							} as UpdateMessage
						);

						sendMessageToTab
							.then(
								() => {
									// console.debug("Successfully sent update message to tab:", { tab, response });
								}
							)
							.catch(
								(error) => {
									// When sending a message to a tab other than "http or https or file",
									// "Uncaught (in promise) Error: Could not establish connection. Receiving end does not exist." occurs in "background.js".
									console.debug("Failed to send update message to tab:", { tab, error });
								}
							);
					});
				});
			});

			return;
		}
	}
}

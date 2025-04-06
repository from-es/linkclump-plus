import { Settings } from './Settings';

export type Messages = ActivateMessage | InitMessage | UpdateMessage;

export enum CopyFormat {
	URLS_WITH_TITLES = 0,
	URLS_ONLY = 1,
	URLS_ONLY_SPACE_SEPARATED = 2,
	TITLES_ONLY = 3,
	AS_LINK_HTML = 4,
	AS_LIST_LINK_HTML = 5,
	AS_MARKDOWN = 6,
}

export type ActivateMessage_copy = {
	"action": "copy",
	"options": {
		"block": boolean,
		"reverse": boolean,
		"copy": CopyFormat
	}
}

export type ActivateMessage_bm = {
	"action": "bm",
	"options": {
		"block": boolean,
		"reverse": boolean,
		"bookmarks": number // string: "0" or "1"
	}
}

export type ActivateMessage_win = {
	"action": "win",
	"options": {
		"block": boolean,
		"reverse": boolean,
		"unfocus": boolean,
		"delay": number,
	}
}

export type ActivateMessage_tabs = {
	"action": "tabs",
	"options": {
		"block": boolean,
		"reverse": boolean,
		"end": boolean,
		"delay": number,
		"close"?: number,
	}
}

export type ActivateMessageTypes = ActivateMessage_copy | ActivateMessage_bm | ActivateMessage_win | ActivateMessage_tabs;

export type ActivateMessage<T extends ActivateMessageTypes = ActivateMessageTypes> = {
	"message": "activate",
	"urls": { url: string, title: string }[],
	"setting": T
}

export type UpdateMessage = {
	"message": "update",
	"settings": Settings,
}

export type InitMessage = {
	"message": "init",
}

export type InitResponse = Settings & { error?: string };
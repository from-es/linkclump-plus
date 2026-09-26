/**
 * Link format options when copying to clipboard (classification numbers 0-6).
 */
export type CopyFormat = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type ActionType = "win" | "tabs" | "bm" | "copy";

export type ActionOptionValue = number | boolean | string | (number | string)[];

export interface ActionOptions {
	smart?: number;
	ignore?: (number | string)[];
	delay?: number;
	close?: number;
	block?: boolean;
	reverse?: boolean;
	end?: boolean;
	fontsizeofcounter?: number;
	fontweightofcounter?: number;
	samebgcolorasbox?: boolean;
	unfocus?: boolean;
	bookmarks?: number | string;
	copy?: CopyFormat | number | string;
	[key: string]: ActionOptionValue | undefined;
}

export interface ActionSetting {
	mouse: number;
	key: number;
	action: ActionType | string;
	color: string;
	options: ActionOptions;
}

export type Settings = {
	actions: Record<string, ActionSetting>;
	blocked: string[];
};

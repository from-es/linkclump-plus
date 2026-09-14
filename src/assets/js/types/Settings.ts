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
	copy?: number | string;
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

/**
 * Validates whether an unknown value conforms to the Settings data structure.
 *
 * @param {unknown} value - Value to validate.
 * @returns {value is Settings} True if the value is a valid Settings object.
 */
export function isSettings(value: unknown): value is Settings {
	return (
		typeof value === "object" &&
		value !== null &&
		"actions" in value &&
		typeof (value as { actions: unknown }).actions === "object" &&
		(value as { actions: unknown }).actions !== null &&
		"blocked" in value &&
		Array.isArray((value as { blocked: unknown }).blocked)
	);
}

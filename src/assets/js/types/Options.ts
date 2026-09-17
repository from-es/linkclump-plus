import type { ActionType } from "@/assets/js/types/Settings";

export interface TriggerDefinition {
	readonly name: string;
}

/**
 * Common option keys shared across all action types (win, tabs, bm, copy).
 */
export type CommonOptionKey =
	| "fontsizeofcounter"    // Counter font size (number)
	| "fontweightofcounter"  // Counter font weight (number)
	| "samebgcolorasbox"     // Synchronize counter background color with box color (checkbox)
	| "smart"                // Smart select: select only important links (selection)
	| "ignore"               // Filter links by keyword exclusion/inclusion (selection-textbox)
	| "block"                // Block repeat links within selection (checkbox)
	| "reverse";             // Open links in reverse order (checkbox)

/**
 * Action-specific or shared difference option keys.
 */
export type ActionSpecificOptionKey =
	// Shared between 'win' and 'tabs'
	| "delay"     // Delay in seconds between opening each link (textbox)

	// 'tabs' specific
	| "close"     // Number of seconds before closing opened tabs (textbox)
	| "end"       // Open tabs at the end of all other tabs (checkbox)

	// 'win' specific
	| "unfocus"   // Do not focus on newly created window (checkbox)

	// 'bm' specific
	| "bookmarks" // Target bookmark folder selection (selection)

	// 'copy' specific
	| "copy";     // Format of links saved to clipboard (selection)

/**
 * All option field identifier keys (13 in total).
 */
export type OptionKey = CommonOptionKey | ActionSpecificOptionKey;

interface OptionFieldDefinitionBase {
	readonly name: string;
	readonly extra: string;
}

/** number input: data = [default, min, max] */
export interface OptionFieldDefinition_Number extends OptionFieldDefinitionBase {
	readonly type: "number";
	readonly data: readonly [number, number, number];
}

/** select dropdown: data = selectable string labels */
export interface OptionFieldDefinition_Selection extends OptionFieldDefinitionBase {
	readonly type: "selection";
	readonly data: readonly string[];
}

/** select + freetext: data = selectable string labels */
export interface OptionFieldDefinition_SelectionTextbox extends OptionFieldDefinitionBase {
	readonly type: "selection-textbox";
	readonly data: readonly string[];
}

/** plain text input: no data */
export interface OptionFieldDefinition_Textbox extends OptionFieldDefinitionBase {
	readonly type: "textbox";
}

/** checkbox: no data */
export interface OptionFieldDefinition_Checkbox extends OptionFieldDefinitionBase {
	readonly type: "checkbox";
}

/** Discriminated union of all option field kinds */
export type OptionFieldDefinition =
	| OptionFieldDefinition_Number
	| OptionFieldDefinition_Selection
	| OptionFieldDefinition_SelectionTextbox
	| OptionFieldDefinition_Textbox
	| OptionFieldDefinition_Checkbox;

export interface ActionDefinition {
	readonly name: string;

	/** Allowed option keys to prevent typos */
	readonly options: readonly OptionKey[];
}

export interface OptionsSchema {
	readonly triggers: readonly TriggerDefinition[];

	/** Enforces definition for all action types ('win' | 'tabs' | 'bm' | 'copy') while allowing safe string lookup */
	readonly actions: Readonly<Record<ActionType, ActionDefinition> & Record<string, ActionDefinition | undefined>>;

	/** Enforces definition for all 13 option keys while allowing safe string lookup */
	readonly options: Readonly<Record<OptionKey, OptionFieldDefinition> & Record<string, OptionFieldDefinition | undefined>>;
}

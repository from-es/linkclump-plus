export interface TriggerDefinition {
	name: string;
}

export interface OptionFieldDefinition {
	name: string;
	type: "number" | "selection" | "selection-textbox" | "textbox" | "checkbox";
	data?: readonly number[] | readonly string[] | (number | string)[];
	extra: string;
}

export interface ActionDefinition {
	name: string;
	options: readonly string[];
}

export interface OptionsSchema {
	triggers: readonly TriggerDefinition[];
	actions: Record<string, ActionDefinition>;
	options: Record<string, OptionFieldDefinition>;
}

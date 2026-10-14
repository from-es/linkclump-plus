import type { SettingsManager } from "./settings/SettingsManager";
import type { ContentScriptManager } from "./scripts/ContentScriptManager";

/**
 * Dependencies created in index.ts and passed to the handlers.
 */
export type Deps = {
	settingsManager: SettingsManager;
	contentScriptManager: ContentScriptManager;
};

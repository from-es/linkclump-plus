import type { SettingsManager } from "./settings/SettingsManager";

/**
 * Dependencies created in index.ts and passed to the handlers.
 */
export type Deps = {
	settingsManager: SettingsManager;
};

import { isSettings } from "@/assets/js/lib/SettingsGuard";

import type { Deps } from "../deps";
import type { UpdateMessage } from "@/assets/js/types/Messages";

/**
 * Validates and saves the settings sent from the options page, then broadcasts them to all open tabs.
 *
 * @param {UpdateMessage} request - Update message containing new settings.
 * @param {Deps} deps - Dependencies created in index.ts.
 * @returns {Promise<void>}
 */
export async function handleUpdateSettings(request: UpdateMessage, deps: Deps): Promise<void> {
	if (!isSettings(request.settings)) {
		console.warn("[background] Rejected invalid settings in update message:", request.settings);
		return;
	}

	await deps.settingsManager.save(request.settings);
	await deps.contentScriptManager.broadcastSettingsUpdate();
}

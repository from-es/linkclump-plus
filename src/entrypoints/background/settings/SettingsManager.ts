/**
 * This module manages the settings for the Linkclump extension, including loading, saving, and initializing default settings.
 * It ensures that settings are valid and provides methods to check if the extension has been initialized or if an update is required.
 */

import { isSettings } from "@/assets/js/lib/SettingsGuard";

import {
	CURRENT_VERSION,
	DEFAULT_SETTINGS,
	linkclumpSettingsKey,
	linkclumpVersionKey
} from "@/assets/js/constants/setting";

import type { StorageManager } from "./StorageManager";
import type { Settings } from "@/assets/js/types/Settings";

/**
 * Install state judged from the stored format version.
 * - first: nothing is stored yet (first installation)
 * - outdated: stored version differs from the current format version
 * - latest: stored version matches the current format version
 */
export type InstallState = "first" | "outdated" | "latest";

export class SettingsManager {
	private readonly storageManager: StorageManager;

	constructor(storageManager: StorageManager) {
		this.storageManager = storageManager;
	}

	/**
	 * Loads settings from sync storage, initializing with defaults if missing or invalid.
	 *
	 * @returns {Promise<Settings>} Loaded or initialized settings.
	 */
	async load(): Promise<Settings> {
		const settings = await this.storageManager.get(linkclumpSettingsKey);

		if (isSettings(settings)) {
			return settings;
		}

		return await this.initialize();
	}

	/**
	 * Saves settings to sync storage after removing any transient error messages.
	 *
	 * @param {Settings & { error?: string }} settings - Settings object to save.
	 * @returns {Promise<void>}
	 */
	async save(settings: Settings & { error?: string }): Promise<void> {
		const cleanSettings: Settings & { error?: string } = { ...settings };
		delete cleanSettings.error;

		await this.storageManager.set(linkclumpSettingsKey, cleanSettings);
	}

	/**
	 * Judges the install state from the stored format version (reads storage once).
	 *
	 * @returns {Promise<InstallState>} "first", "outdated", or "latest".
	 */
	async getInstallState(): Promise<InstallState> {
		const version = await this.storageManager.get(linkclumpVersionKey);

		if (version === undefined) {
			return "first";
		}

		return version === CURRENT_VERSION ? "latest" : "outdated";
	}

	/**
	 * Creates the default settings without saving them.
	 *
	 * @returns {Settings} A copy of the default settings.
	 */
	createDefaultSettings(): Settings {
		return structuredClone(DEFAULT_SETTINGS);
	}

	/**
	 * Initializes sync storage with default settings.
	 *
	 * @returns {Promise<Settings>} Newly initialized default settings.
	 */
	async initialize(): Promise<Settings> {
		const settings = this.createDefaultSettings();

		// save settings to store
		await this.storageManager.set(linkclumpSettingsKey, settings);
		await this.storageManager.set(linkclumpVersionKey, CURRENT_VERSION);

		return settings;
	}

	/**
	 * Updates settings if not already initialized.
	 *
	 * @returns {Promise<void>}
	 */
	async migrateIfNeeded(): Promise<void> {
		if ((await this.getInstallState()) === "first") {
			await this.initialize();
		}
	}
}

/**
 * This module manages the settings for the Linkclump extension, including loading, saving, and initializing default settings.
 * It ensures that settings are valid and provides methods to check if the extension has been initialized or if an update is required.
 */

// WXT provided cross-browser compatible API
import { browser } from "wxt/browser";

import { isSettings } from "@/assets/js/lib/SettingsGuard";

import {
	CURRENT_VERSION,
	DEFAULT_SETTINGS,
	linkclumpSettingsKey,
	linkclumpVersionKey
} from "@/assets/js/constants/setting";

import type { Settings } from "@/assets/js/types/Settings";

export class SettingsManager {
	/**
	 * Loads settings from sync storage, initializing with defaults if missing or invalid.
	 *
	 * @returns {Promise<Settings>} Loaded or initialized settings.
	 */
	async load(): Promise<Settings> {
		const result = await browser.storage.sync.get(linkclumpSettingsKey);
		const settings = result[linkclumpSettingsKey];

		if (isSettings(settings)) {
			return settings;
		}

		return await this.init();
	}

	/**
	 * Saves settings to sync storage after removing any transient error messages.
	 *
	 * @param {Settings & { error?: string }} settings - Settings object to save.
	 * @returns {Promise<void>}
	 */
	async save(settings: Settings & { error?: string }): Promise<void> {
		// remove any error messages from object (shouldn't be there)
		if (settings.error !== undefined) {
			delete settings.error;
		}

		await browser.storage.sync.set({ [linkclumpSettingsKey]: settings });
	}

	/**
	 * Checks if the version key exists in sync storage.
	 *
	 * @returns {Promise<boolean>} True if initialized, false otherwise.
	 */
	async isInit(): Promise<boolean> {
		const { [linkclumpVersionKey]: version } = await browser.storage.sync.get(linkclumpVersionKey);
		return version !== undefined;
	}

	/**
	 * Checks if the stored version matches the current format version.
	 *
	 * @returns {Promise<boolean>} True if version is up to date, false otherwise.
	 */
	async isLatest(): Promise<boolean> {
		const { [linkclumpVersionKey]: version } = await browser.storage.sync.get(linkclumpVersionKey);
		return version === CURRENT_VERSION;
	}

	/**
	 * Initializes sync storage with default settings.
	 *
	 * @returns {Promise<Settings>} Newly initialized default settings.
	 */
	async init(): Promise<Settings> {
		// create default settings for first time user.
		const settings = structuredClone(DEFAULT_SETTINGS);

		// save settings to store
		await browser.storage.sync.set({ [linkclumpSettingsKey]: settings });
		await browser.storage.sync.set({ [linkclumpVersionKey]: CURRENT_VERSION });

		return settings;
	}

	/**
	 * Updates settings if not already initialized.
	 *
	 * @returns {Promise<void>}
	 */
	async update(): Promise<void> {
		if (!(await this.isInit())) {
			await this.init();
		}
	}
}

// Export as a singleton instance for use throughout the application
export const settingsManager = new SettingsManager();

/**
 * This module manages the settings for the Linkclump extension, including loading, saving, and initializing default settings.
 * It ensures that settings are valid and provides methods to check if the extension has been initialized or if an update is required.
 */

// WXT provided cross-browser compatible API
import { browser } from "wxt/browser";

import { isSettings } from "@/assets/js/lib/SettingsGuard";

import {
	FILTER_EXCLUDE_LINKS,
	SMART_SELECT_ON
} from "@/assets/js/constants/action";
import { KEY_CODE_DEFAULT_Z } from "@/assets/js/constants/keyboard";
import { MOUSE_BUTTON_LEFT } from "@/assets/js/constants/mouseButton";
import {
	COUNTER_FONT_SIZE_DEFAULT,
	COUNTER_FONT_WEIGHT_DEFAULT
} from "@/assets/js/constants/ui";

import type { Settings } from "@/assets/js/types/Settings";

// Format version
const CURRENT_VERSION = "5";

// key name for Stroage
const linkclumpSettingsKey = "linkclumpSettings";
const linkclumpVersionKey = "linkclumpVersion";

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
		const settings: Settings = {
			"actions": {
				"101": {
					"mouse": MOUSE_BUTTON_LEFT,  // left mouse button
					"key": KEY_CODE_DEFAULT_Z,   // z key
					"action": "tabs",
					"color": "#FFA500",
					"options": {
						"smart": SMART_SELECT_ON,
						"ignore": [ FILTER_EXCLUDE_LINKS ],
						"delay": 0,
						"close": 0,
						"block": true,
						"reverse": false,
						"end": false,
						"fontsizeofcounter": COUNTER_FONT_SIZE_DEFAULT,
						"fontweightofcounter": COUNTER_FONT_WEIGHT_DEFAULT,
						"samebgcolorasbox": true  // If you want to set the color of counter to the same as the box color, specify a value of true
					}
				}
			},
			"blocked": []
		};

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

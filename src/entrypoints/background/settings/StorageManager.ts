/**
 * Thin wrapper over browser.storage.sync for key-value persistence.
 * This class has no domain knowledge of settings, keys, or validation.
 */

// WXT provided cross-browser compatible API
import { browser } from "wxt/browser";

export class StorageManager {
	/**
	 * Reads the value stored under the specified key.
	 *
	 * @param {string} key - Storage key name.
	 * @returns {Promise<unknown>} Stored value, or undefined if not present.
	 */
	async get(key: string): Promise<unknown> {
		const result = await browser.storage.sync.get(key);
		return result[key];
	}

	/**
	 * Stores the value under the specified key.
	 *
	 * @param {string} key - Storage key name.
	 * @param {unknown} value - Value to store.
	 * @returns {Promise<void>}
	 */
	async set(key: string, value: unknown): Promise<void> {
		await browser.storage.sync.set({ [key]: value });
	}
}

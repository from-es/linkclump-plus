/**
 * Utilities for importing and exporting extension settings as JSON files.
 *
 * Provides browser file-picker based import, download-based export, OS-safe
 * filename sanitization, and manifest-aware default naming for generated files.
 *
 * @requires {@link https://wxt.dev/|wxt}
 * @requires {@link https://day.js.org/|Day.js}
 */

// WXT provided cross-browser compatible API.
import { browser } from "wxt/browser";

import { dateFormatter } from "@/assets/js/lib/dateFormatter";



/**
 * Minimal identity information from a browser extension manifest — `name` and `version` only.
 * Used to build export filenames.
 */
type ManifestIdentityInfo = {
	name: string;
	version: string;
};

/**
 * File format definition for setting files.
 *
 * Defines the expected MIME type and file extension used for setting import and export operations.
 */
const SETTING_FILE = Object.freeze({
	mimetype: "application/json",
	extension: "json"
} as const);

/**
 * Application identity information used as a fallback only when running outside a browser
 * extension context (e.g. unit tests), where no manifest exists and `chrome.runtime.getManifest`
 * is unavailable.
 */
const FALLBACK_APPLICATION_INFO: Readonly<ManifestIdentityInfo> = Object.freeze({
	name: "settings",
	version: "0.0.0"
} as const);

/**
 * Date format string for generating timestamped export filenames.
 */
const DATE_FORMAT = "YYYY-MM-DD_HH-mm-ss";

/**
 * Indentation string used when serializing JSON data for export.
 * Formats JSON with a tab character for human readability.
 */
const JSON_INDENT = "\t";

/**
 * Delay in milliseconds before revoking the temporary object URL and removing the anchor element.
 * Provides sufficient time for the browser to initiate the download before the resource is released.
 */
const OBJECT_URL_REVOKE_DELAY_MS = 1000;

/**
 * Regex matching OS-reserved filename characters: < > : " / \ | ? *
 */
const RESERVED_FILENAME_CHARS_REGEX = /[<>:"/\\|?*]/g;

/**
 * Regex matching ASCII control characters (0x00-0x1F, 0x7F).
 * Uses the Unicode-aware "u" flag so multi-byte characters (e.g. surrogate pairs) are left intact.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/gu;



/**
 * Triggers a file open dialog and imports data from a JSON file.
 *
 * @template T - Type of the data object.
 * @returns {Promise<T | null>} Parsed data object, or null if the file dialog was canceled, the file format was invalid, or parsing failed.
 */
async function importFile<T = unknown>(): Promise<T | null> {
	try {
		const file = await showOpenFileDialog(SETTING_FILE.mimetype);
		if (!file) {
			return null;
		}

		const isJsonMime = file.type === SETTING_FILE.mimetype;
		const isJsonExt = file.name.toLowerCase().endsWith(`.${SETTING_FILE.extension}`);

		if (!isJsonMime && !isJsonExt) {
			throw new Error(`Invalid file format: selected file is not a JSON file (type: "${file.type}", name: "${file.name}").`);
		}

		const text = await readAsText(file);
		const result = JSON.parse(text) as T;

		return result;
	} catch (error) {
		console.error("Failed to read settings file:", error);

		return null;
	}
}

/**
 * Exports data to a file and triggers a browser download.
 *
 * @template T - Type of the data object.
 * @param {T} data - Data object to serialize and export.
 * @param {string} [filename] - Download file name. If omitted, a filename with timestamp is
 *   generated automatically. Including spaces in the filename is discouraged.
 * @param {ManifestIdentityInfo} [manifest] - Manifest identity info used for default filename
 *   generation. Defaults to runtime manifest.
 * @returns {boolean} True if the export was initiated successfully, false otherwise.
 */
function exportFile<T>(
	data: T,
	filename?: string,
	manifest?: ManifestIdentityInfo
): boolean {
	const finalFilename = filename ?? generateDefaultFilename(manifest);

	return downloadFile(data, finalFilename, SETTING_FILE.mimetype);
}

/**
 * Sanitizes a string to be safely used as a filename token.
 * Replaces whitespace with hyphens and removes OS-reserved characters (< > : " / \ | ? *) and control characters.
 *
 * Uses regex-based replacement instead of split/filter/join so multi-byte characters
 * (e.g. surrogate pairs) are not broken apart, and so the string is processed without
 * intermediate per-character array allocation.
 *
 * @param {string} token - The string token to sanitize.
 * @param {string} fallback - Fallback string to use if the token becomes empty after sanitization.
 * @returns {string} Sanitized string safe for file naming across operating systems.
 * @throws {TypeError} If fallback is not a string, is empty, or consists only of whitespace.
 */
function sanitizeFilenameToken(token: string, fallback: string): string {
	if (typeof fallback !== "string" || fallback.trim().length === 0) {
		throw new TypeError("Fallback token must be a non-empty string.");
	}

	return (
		token
			.trim()
			.replace(/\s+/g, "-")
			.replace(RESERVED_FILENAME_CHARS_REGEX, "")
			.replace(CONTROL_CHARS_REGEX, "")
			.replace(/-+/g, "-")
			.replace(/^[-.]+|[-.]+$/g, "") || fallback
	);
}

/**
 * Displays a file open dialog to the user.
 *
 * @param {string} mimetype - The accepted MIME type for the file dialog.
 * @returns {Promise<File | null>} A promise that resolves with the selected file, or null if canceled.
 */
function showOpenFileDialog(mimetype: string): Promise<File | null> {
	return new Promise(resolve => {
		const input = document.createElement("input");

		input.type = "file";
		input.accept = mimetype;
		input.onchange = (event) => {
			const target = event.target as HTMLInputElement;
			resolve(target.files?.[0] ?? null);
		};
		input.oncancel = () => {
			resolve(null);
		};

		input.click();
	});
}

/**
 * Reads the content of a file as text.
 *
 * @param {File} file - The file to read.
 * @returns {Promise<string>} A promise that resolves with the text content of the file.
 */
function readAsText(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onload = () => { resolve(reader.result as string); };
		reader.onerror = () => {
			reject(new Error(`Failed to read file: "${file.name}".`));
		};
		reader.readAsText(file);
	});
}

/**
 * Downloads serialized data as a file.
 *
 * @template T - Type of the data object.
 * @param {T} data - Data object to serialize and download.
 * @param {string} filename - Download file name.
 * @param {string} mimetype - MIME type of the file.
 * @returns {boolean} True if the download was initiated successfully, false otherwise.
 */
function downloadFile<T>(data: T, filename: string, mimetype: string): boolean {
	try {
		const jsonText = JSON.stringify(data, null, JSON_INDENT);
		const file = { mimetype, name: filename };
		const blob = new Blob([ jsonText ], { type: file.mimetype });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");

		anchor.download = file.name;
		anchor.href = url;
		anchor.dataset.downloadurl = [ file.mimetype, anchor.download, anchor.href ].join(":");
		anchor.click();

		setTimeout(
			() => {
				URL.revokeObjectURL(url);
				anchor.remove();
			},
			OBJECT_URL_REVOKE_DELAY_MS
		);

		return true;
	} catch (error) {
		console.error("Failed to export settings file:", error);

		return false;
	}
}

/**
 * Retrieves manifest identity information safely with a fallback for non-extension environments.
 *
 * Returns a shallow copy of the fallback so callers cannot mutate the shared module-level constant.
 *
 * @param {ManifestIdentityInfo} [manifest] - Optional manifest identity info for dependency injection.
 * @param {ManifestIdentityInfo} [fallback=FALLBACK_APPLICATION_INFO] - Fallback manifest identity info if runtime manifest is inaccessible.
 * @returns {ManifestIdentityInfo} Resolved manifest identity information.
 */
function getManifestIdentityInfo(
	manifest?: ManifestIdentityInfo,
	fallback: ManifestIdentityInfo = FALLBACK_APPLICATION_INFO
): ManifestIdentityInfo {
	if (manifest) {
		return manifest;
	}

	// In certain execution contexts (e.g., unit test environments like Vitest/Node.js or when the extension context is invalidated),
	// runtime.getManifest may be unavailable; return the default application info as a fallback.
	try {
		if (browser?.runtime?.getManifest) {
			return browser.runtime.getManifest();
		}
	} catch (error) {
		console.warn("Failed to retrieve extension manifest, falling back to default application info:", error);
	}

	return { ...fallback };
}

/**
 * Generates the default export filename with timestamp.
 *
 * @param {ManifestIdentityInfo} [manifest] - Optional manifest info for dependency injection.
 * @returns {string} Formatted filename.
 */
function generateDefaultFilename(manifest?: ManifestIdentityInfo): string {
	const { name, version } = getManifestIdentityInfo(manifest);
	const datestr = dateFormatter(new Date(), DATE_FORMAT);
	const sanitizedName = sanitizeFilenameToken(name, FALLBACK_APPLICATION_INFO.name);
	const sanitizedVersion = sanitizeFilenameToken(version, FALLBACK_APPLICATION_INFO.version);
	const fileName = `${sanitizedName}_v${sanitizedVersion}_${datestr}.${SETTING_FILE.extension}`;

	return fileName;
}



export {
	importFile,
	exportFile
};
export type {
	ManifestIdentityInfo
};

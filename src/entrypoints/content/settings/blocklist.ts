import { createRegExp } from "@/assets/js/lib/regexp";

/**
 * Checks a URL against the blocklist patterns. Each non-empty entry is a
 * case-insensitive regular expression that matches anywhere in the URL. An entry
 * that is not a valid regular expression is skipped (with a warning) instead of
 * stopping the content script.
 *
 * @param {readonly string[]} blockedPatterns - Blocklist entries from the settings.
 * @param {string} url - URL of this frame.
 * @returns {boolean} True if the URL matches at least one entry.
 */
export function isBlockedUrl(blockedPatterns: readonly string[], url: string): boolean {
	if (typeof url !== "string" || !url.trim()) {
		return false;
	}

	if (!Array.isArray(blockedPatterns)) {
		return false;
	}

	for (const blocked of blockedPatterns) {
		if (typeof blocked !== "string" || !blocked.trim()) {
			continue;
		}

		const re = createRegExp(blocked);
		if (re === null) {
			console.warn("Ignoring an invalid blocklist pattern:", blocked);
			continue;
		}

		if (re.test(url)) {
			console.info("Blocked on this site by matching pattern:", { pattern: blocked, url: url });
			return true;
		}
	}

	return false;
}

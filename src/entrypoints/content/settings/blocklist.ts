/**
 * Checks a URL against the blocklist patterns. Each non-empty entry is a
 * case-insensitive regular expression that matches anywhere in the URL.
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

		const re = new RegExp(blocked, "i");
		if (re.test(url)) {
			console.info("Blocked on this site by matching pattern:", { pattern: blocked, url: url });
			return true;
		}
	}

	return false;
}

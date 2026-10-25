/**
 * Helpers for regular expressions that come from user input (the blocklist and the words of
 * "filter links"). Such patterns can be invalid, and `new RegExp()` throws on those, so the
 * code that uses them must never call the constructor directly.
 */

/**
 * Creates a RegExp from a user-supplied pattern without throwing.
 *
 * @param {string} source - Pattern source.
 * @param {string} [flags="i"] - RegExp flags (case-insensitive by default).
 * @returns {RegExp | null} The RegExp, or null if the pattern is invalid.
 */
export function createRegExp(source: string, flags: string = "i"): RegExp | null {
	try {
		return new RegExp(source, flags);
	} catch {
		return null;
	}
}

/**
 * Returns the reason why a pattern is invalid.
 *
 * @param {string} source - Pattern source.
 * @param {string} [flags="i"] - RegExp flags (case-insensitive by default).
 * @returns {string | null} The error message from the browser, or null if the pattern is valid.
 */
export function getRegExpError(source: string, flags: string = "i"): string | null {
	try {
		new RegExp(source, flags);
		return null;
	} catch (error) {
		return error instanceof Error ? error.message : String(error);
	}
}

/**
 * Finds the first invalid pattern in a list. Blank entries are skipped because they are
 * ignored wherever the list is used.
 *
 * @param {readonly string[]} patterns - Pattern sources.
 * @param {string} [flags="i"] - RegExp flags (case-insensitive by default).
 * @returns {{ pattern: string, message: string } | null} The first invalid pattern with the
 *   browser's error message, or null if every pattern is valid.
 */
export function findInvalidPattern(patterns: readonly string[], flags: string = "i"): { pattern: string, message: string } | null {
	for (const pattern of patterns) {
		if (!pattern || !/\S/.test(pattern)) {
			continue;
		}

		const message = getRegExpError(pattern, flags);
		if (message !== null) {
			return { pattern, message };
		}
	}

	return null;
}

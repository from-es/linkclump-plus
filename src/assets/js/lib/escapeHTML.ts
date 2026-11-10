/**
 * Utilities for escaping HTML special characters to prevent Cross-Site Scripting (XSS).
 */

/**
 * Regular expression matching characters that require HTML entity escaping.
 */
const ESCAPE_REGEX = /[&'`"<>]/g;

/**
 * Mapping of HTML special characters to their corresponding entity representations.
 */
const HTML_ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"'": "&#x27;",
	"`": "&#x60;",
	"\"": "&quot;",
	"<": "&lt;",
	">": "&gt;"
};

/**
 * Escapes HTML special characters in the specified string to prevent Cross-Site Scripting (XSS).
 *
 * Converts `&`, `'`, `` ` ``, `"`, `<`, and `>` to their corresponding HTML entities.
 *
 * @param {unknown} target - The value to escape. Must be a string.
 * @returns {string} The escaped safe HTML string.
 * @throws {TypeError} Thrown when `target` is not a string.
 */
export function escapeHTML(target: unknown): string {
	// Ensure target is a string.
	if (typeof target !== "string") {
		console.error("Invalid argument: 'target' must be a string:", { target });
		throw new TypeError("Invalid argument: 'target' must be a string.");
	}

	return target.replace(ESCAPE_REGEX, (match) => HTML_ESCAPES[match]!);
}

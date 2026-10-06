/**
 * Provides date formatting utilities.
 *
 * @requires {@link https://day.js.org/|Day.js}
 */

// Import NPM Package
import dayjs from "dayjs";

/**
 * Default date format used when no format is specified.
 *
 * Date and time format for iso 8601. e.g. "20010101T123000" for January 1, 2001, 12:30:00 (local time).
 */
const DEFAULT_DATE_FORMAT = "YYYYMMDDThhmmss";

/**
 * Defines the minimum and maximum valid date values in milliseconds since the Unix epoch.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#valid_date_range|Date: Valid Date Range - MDN}
 */
const DATE_MIN = -8640000000000000;  // Minimum valid date in milliseconds
const DATE_MAX = 8640000000000000;   // Maximum valid date in milliseconds

/**
 * Converts the specified Date object into a formatted string.
 *
 * **Warning**
 * **Note on format strings**
 * `dayjs` does not validate format strings; it replaces recognized tokens and leaves other characters unchanged.
 * (Example: for 15:00, `format("Hello")` ➔ `"15ello"`)
 *
 * @param {Date} date - The Date object to format.
 * @param {string} [format] - The format string to apply. Defaults to "YYYYMMDDThhmmss".
 * @returns {string} The formatted date string.
 * @throws {TypeError} - Thrown when `date` is not a Date instance or is an invalid Date (`getTime()` returns NaN).
 * @throws {TypeError} - Thrown when `format` is not a string.
 */
export function dateFormatter(
	date: Date,
	format: string = DEFAULT_DATE_FORMAT
): string {
	// Ensure date is a valid Date object.
	const dateValue = date.getTime();
	const isValidDate = date instanceof Date && !Number.isNaN(dateValue) && isFinite(dateValue) && (dateValue >= DATE_MIN && dateValue <= DATE_MAX);
	if (!isValidDate) {
		throw new TypeError("Invalid date: must be a valid Date object.");
	}

	// Ensure format is a string.
	const isValidFormat = typeof format === "string" && format.trim() !== "";
	if (!isValidFormat) {
		throw new TypeError("Invalid format: must be a string.");
	}

	return dayjs(date).format(format);
}

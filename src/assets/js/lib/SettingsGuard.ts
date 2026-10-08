import type { Settings } from "@/assets/js/types/Settings";

/**
 * Validates whether an unknown value conforms to the Settings data structure.
 *
 * @param {unknown} value - Value to validate.
 * @returns {value is Settings} True if the value is a valid Settings object.
 */
export function isSettings(value: unknown): value is Settings {
	return (
		typeof value === "object" &&
		value !== null &&
		"actions" in value &&
		typeof (value as { actions: unknown }).actions === "object" &&
		(value as { actions: unknown }).actions !== null &&
		"blocked" in value &&
		Array.isArray((value as { blocked: unknown }).blocked)
	);
}

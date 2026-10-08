import {
	OS_LINUX,
	OS_MAC,
	OS_WIN
} from "@/assets/js/constants/os";
import {
	MOUSE_BUTTON_LEFT,
	MOUSE_BUTTON_RIGHT
} from "@/assets/js/constants/mouseButton";
import {
	KEY_CODE_NONE,
	KEY_CODE_SHIFT,
	KEY_CODE_CTRL,
	KEY_CODE_ALT,
	KEY_CODE_META
} from "@/assets/js/constants/keyboard";
import {
	COUNTER_FONT_SIZE_DEFAULT,
	COUNTER_FONT_SIZE_MIN,
	COUNTER_FONT_SIZE_MAX,
	COUNTER_FONT_WEIGHT_MIN,
	COUNTER_FONT_WEIGHT_MAX
} from "@/assets/js/constants/ui";

// ---------------------------------------------------------------------------
// allowSelection / findTouchSettingId
//
// Called from pointermove / pointerup / scroll / startSelection. Besides matching the
// current mouse+key against the configured settings, allowSelection() also applies the
// matched setting's box/counter styling as a side effect. The pure, side-effect-free
// matching functions further down this file (isMouseKeyMatch, computeStopMenuOnPointerDown,
// etc.) are a separate, narrower-purpose set of helpers and do not replace this one.
// ---------------------------------------------------------------------------

/**
 * Picks the setting that a confirmed touch hold should trigger. Touch input cannot hold
 * down modifier keys, so a "Left click" setting without a key (KEY_CODE_NONE) is
 * preferred; otherwise the first left-click setting found is used as a fallback.
 *
 * @returns {string | undefined} The matching entry's key in `window.settings`, or
 *   undefined if no left-click setting exists at all.
 */
export function findTouchSettingId(): string | undefined {
	let fallbackId: string | undefined;

	for (const i in window.settings) {
		const setting = window.settings[i];
		if (!setting || Number(setting.mouse) !== MOUSE_BUTTON_LEFT) {
			continue;
		}
		if (Number(setting.key) === KEY_CODE_NONE) {
			return i;
		}
		fallbackId ??= i;
	}

	return fallbackId;
}

/**
 * Checks whether the current mouse button + held key matches one of the configured
 * Actions, and if so, selects it (`window.setting`) and applies its box/counter styling.
 * When called with a PointerEvent, first re-syncs `window.key_pressed` from the event's
 * own modifier flags (metaKey/ctrlKey/shiftKey/altKey), since a key held from before this
 * pointer interaction began would otherwise not be reflected in `window.key_pressed` yet.
 * A confirmed touch hold with no physical key counts as a match for whichever setting
 * findTouchSettingId() picks, even though touch can't literally hold a key down.
 *
 * @param {PointerEvent} [event] - The pointer event to re-sync modifier keys from, if any.
 * @returns {boolean} True if a matching setting was found (and applied), false otherwise.
 */
export function allowSelection(event?: PointerEvent): boolean {
	if (event) {
		if (event.metaKey && window.key_pressed === 0) {
			window.key_pressed = KEY_CODE_META;
		} else if (event.ctrlKey && window.key_pressed === 0) {
			window.key_pressed = KEY_CODE_CTRL;
		} else if (event.shiftKey && window.key_pressed === 0) {
			window.key_pressed = KEY_CODE_SHIFT;
		} else if (event.altKey && window.key_pressed === 0) {
			window.key_pressed = KEY_CODE_ALT;
		}
	}

	// Determine which setting a confirmed touch hold should trigger (once, before the loop)
	const touchSettingId = (window.pointer_type === "touch" && window.touch_active)
		? findTouchSettingId()
		: undefined;

	for (const i in window.settings) {
		const setting = window.settings[i];
		if (!setting) {
			continue;
		}

		const settingMouse = Number(setting.mouse);
		const settingKey = Number(setting.key);

		// On macOS, Ctrl + Left Click is synthesized by the OS as button: 2 (Right Click) with ctrlKey: true.
		// When the user configured Left Click + Ctrl, treat this simulated right click as a match.
		const isMacCtrlLeftClickEmulatedHere =
			window.os === OS_MAC &&
			window.mouse_button === MOUSE_BUTTON_RIGHT &&
			window.key_pressed === KEY_CODE_CTRL &&
			settingMouse === MOUSE_BUTTON_LEFT &&
			settingKey === KEY_CODE_CTRL;

		let isMouseMatch = settingMouse === window.mouse_button || isMacCtrlLeftClickEmulatedHere;
		let isKeyMatch = settingKey === window.key_pressed;

		// When touch hold is active without physical keyboard, allow the preferred left-button action
		if (touchSettingId !== undefined && i === touchSettingId) {
			isMouseMatch = true;
			isKeyMatch = true;
		}

		// need to check if key is 0 as key_pressed might not be accurate
		if (isMouseMatch && isKeyMatch) {
			window.setting = Number.parseInt(i, 10);

			if (window.box !== null) {
				// box
				window.box.style.border = "2px dotted " + (setting?.color ?? "red");

				// counter
				if ((setting?.color && typeof setting.color === "string") && (setting?.options && Object.hasOwn(setting.options, "samebgcolorasbox") && typeof setting.options.samebgcolorasbox === "boolean")) {
					if (setting.options.samebgcolorasbox === true) {
						window.count_label.style.color = "white";
						window.count_label.style.borderColor = "white";
						window.count_label.style.backgroundColor = setting.color.toString();
					} else {
						window.count_label.style.color = "black";
						window.count_label.style.borderColor = "transparent";
						window.count_label.style.backgroundColor = "transparent";
					}
				}
				if (setting?.options?.fontsizeofcounter && (typeof setting.options.fontsizeofcounter === "number")) {
					const num = setting.options.fontsizeofcounter;
					const base = num || COUNTER_FONT_SIZE_DEFAULT;

					window.count_label.style.fontSize = `${base * 1}px`;
					window.count_label.style.lineHeight = `${base * 1}px`;

					window.count_label.style.padding = `${base * 0.50}px`;
					window.count_label.style.borderWidth = `${base * 0.25}px`;
					window.count_label.style.borderRadius = `${base * 0.50}px`;
				} else {
					console.warn(`Invalid fontsizeofcounter value (expected number between ${COUNTER_FONT_SIZE_MIN} and ${COUNTER_FONT_SIZE_MAX}):`, setting.options.fontsizeofcounter);
				}
				if (setting?.options?.fontweightofcounter && (typeof setting.options.fontweightofcounter === "number") && (COUNTER_FONT_WEIGHT_MIN <= setting.options.fontweightofcounter && setting.options.fontweightofcounter <= COUNTER_FONT_WEIGHT_MAX)) {
					const weight = setting.options.fontweightofcounter;

					window.count_label.style.fontWeight = weight.toString();
				} else {
					console.warn(`Invalid fontweightofcounter value (expected number between ${COUNTER_FONT_WEIGHT_MIN} and ${COUNTER_FONT_WEIGHT_MAX}):`, setting.options.fontweightofcounter);
				}
			}

			return true;
		}
	}
	return false;
}

// ---------------------------------------------------------------------------
// DOM-free pure matching functions
//
// These exist solely to decide, at pointerdown time, whether the native context menu
// (window.stop_menu) should be suppressed. They never update window.setting and never
// touch box/counter styling, so they serve a different purpose from allowSelection()
// above and are not interchangeable with it.
// ---------------------------------------------------------------------------

export type OS = typeof OS_WIN | typeof OS_LINUX | typeof OS_MAC;

export interface RawPointerState {
	os: OS;
	mouseButton: number;
	ctrlKey: boolean;
	keyPressed: number;
	pointerType: string;
}

/**
 * On macOS, Ctrl + Left Click is synthesized by the OS at the button level as
 * button: 2 (Right Click), not button: 0. Do not assume button: 0 here.
 *
 * @param {RawPointerState} state - The current OS, mouse button, modifier keys, and pointer type.
 * @returns {boolean} True if this state represents an emulated Ctrl+Left-Click on macOS.
 */
export function isMacCtrlLeftClickEmulated(state: RawPointerState): boolean {
	return state.os === OS_MAC && state.mouseButton === MOUSE_BUTTON_RIGHT && state.ctrlKey;
}

/**
 * Pure, DOM-free check for whether a raw pointer state matches a given mouse+key setting,
 * accounting for macOS's Ctrl+Left-Click emulation (see isMacCtrlLeftClickEmulated).
 *
 * @param {RawPointerState} state - The current OS/mouse button/key/pointer type.
 * @param {{ mouse: number, key: number }} setting - The configured mouse button + key to compare against.
 * @returns {boolean} True if both the mouse button and key match.
 */
export function isMouseKeyMatch(state: RawPointerState, setting: { mouse: number; key: number }): boolean {
	const emulated = isMacCtrlLeftClickEmulated(state);
	const mouseMatch = setting.mouse === state.mouseButton || (emulated && setting.mouse === MOUSE_BUTTON_LEFT);
	const keyMatch = setting.key === state.keyPressed;
	return mouseMatch && keyMatch;
}

/**
 * Finds the first setting in window.settings whose mouse button + key matches the
 * given state, with no side effects. This mirrors allowSelection()'s search logic but
 * never updates window.setting or touches box/counter styling; it exists only to feed
 * computeStopMenuOnPointerDown() below at pointerdown time.
 *
 * @param {RawPointerState} state - The pointer and modifier key state to match against.
 * @returns {{ mouse: number, key: number } | null} The matched button+key pair, or null if none match.
 */
export function findMatchingMouseKeySetting(state: RawPointerState): { mouse: number; key: number } | null {
	for (const i in window.settings) {
		const setting = window.settings[i];
		if (!setting) { continue; }
		const candidate = { mouse: Number(setting.mouse), key: Number(setting.key) };
		if (isMouseKeyMatch(state, candidate)) {
			return candidate;
		}
	}
	return null;
}

/**
 * Decides, at pointerdown time, whether `window.stop_menu` should be updated and what
 * to set it to, so that the native context menu can be suppressed before it fires.
 *
 * MUST be called synchronously from the pointerdown handler itself. On macOS and Linux,
 * `contextmenu` fires in the same tick as `pointerdown` (before any `pointermove`), so
 * deciding this later - e.g. from a drag-start callback that only runs once a movement
 * threshold is crossed - would be too late to prevent the native menu from flashing.
 *
 * @param {RawPointerState} state - The current pointer and modifier state.
 * @param {{ mouse: number, key: number } | null} matchingSetting - The setting matched by findMatchingMouseKeySetting, if any.
 * @returns {boolean | null} Tri-state result:
 *   - true/false: safe to assign to window.stop_menu immediately.
 *   - null: this pointerdown should not touch stop_menu at all. This covers touch input
 *     (handled by separate touch-hold logic) and Linux, whose menu-suppression state
 *     continues to be owned by the keydown/keyup handlers rather than pointerdown.
 */
export function computeStopMenuOnPointerDown(
	state: RawPointerState,
	matchingSetting: { mouse: number; key: number } | null
): boolean | null {
	if (state.pointerType === "touch") { return null; }
	if (state.os === OS_LINUX) { return null; }
	if (state.os === OS_WIN) { return false; }
	// macOS (including the synthesized Ctrl+Left-Click case): decide right away.
	return matchingSetting !== null && isMouseKeyMatch(state, matchingSetting);
}

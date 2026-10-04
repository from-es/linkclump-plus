import { OS_LINUX } from "@/assets/js/constants/os";
import {
	KEY_CODE_META,
	KEY_CODE_META_RIGHT,
	KEY_CODE_META_FIREFOX_MAC,
	KEY_CODE_END,
	KEY_CODE_HOME
} from "@/assets/js/constants/keyboard";
import { isTrustedEvent } from "../utils/isTrustedEvent";
import { isTouchHoldArmed } from "../touch/touchHold";
import { stop } from "../selection/lifecycle";

/**
 * Checks whether any configured Action uses the given key code as its trigger modifier.
 *
 * Used on Linux to decide whether a held key should suppress the native context menu,
 * since right-click there requires a key and `contextmenu` fires in sync with mousedown.
 *
 * @param {number} keyCode - The key code to look for among `window.settings`.
 * @returns {boolean} True if at least one setting uses this key.
 */
export function allowKey(keyCode: number): boolean {
	for (const i in window.settings) {
		if (Number(window.settings[i]?.key) === keyCode) {
			return true;
		}
	}

	return false;
}

/**
 * Tracks the currently held modifier key in `window.key_pressed`, normalizing the various
 * ways browsers report the Meta/Command key (`event.key`, `event.code`, and the Firefox/
 * right-Meta key codes) to a single KEY_CODE_META value. On Linux, also arms
 * `window.stop_menu` immediately if the newly pressed key is used by a configured Action,
 * since Linux's native context menu fires in sync with mousedown rather than mouseup and
 * must be suppressed before the click even happens. Home/End are ignored entirely (and
 * instead treated as a scroll-bug workaround) since they are not valid Action modifiers.
 *
 * @param {KeyboardEvent} event - The keydown event.
 * @returns {void}
 */
export function keydown(event: KeyboardEvent): void {
	if (!isTrustedEvent(event)) {
		return;
	}

	if (event.code !== KEY_CODE_END && event.code !== KEY_CODE_HOME) {
		let keyCode = event.keyCode;
		if (
			event.key === "Meta" ||
			event.code === "MetaLeft" ||
			event.code === "MetaRight" ||
			keyCode === KEY_CODE_META_FIREFOX_MAC ||
			keyCode === KEY_CODE_META_RIGHT
		) {
			keyCode = KEY_CODE_META;
		}
		window.key_pressed = keyCode;
		// turn menu off for linux
		if (window.os === OS_LINUX && allowKey(window.key_pressed)) {
			window.stop_menu = true;
		}
	} else {
		window.scroll_bug_ignore = true;
	}
}

/**
 * Clears the tracked key state on focus loss, and cancels any selection in progress (either
 * an active drag or a pending touch hold) if the window itself lost focus - e.g. the user
 * switched apps or tabs mid-drag - since no further pointer/keyboard events for that
 * selection will arrive once focus is gone.
 *
 * @param {FocusEvent} event - The blur event.
 * @returns {void}
 */
export function blur(event: FocusEvent): void {
	if (!isTrustedEvent(event)) {
		return;
	}

	removeKey();

	// window lost focus (e.g. app switch) in the middle of a selection: cancel it
	if (event.target === window && (window.box_on || isTouchHoldArmed())) {
		stop();
	}
}

/**
 * Clears the tracked key state when a non-Home/End key is released.
 *
 * @param {KeyboardEvent} event - The keyup event.
 * @returns {void}
 */
export function keyup(event: KeyboardEvent): void {
	if (!isTrustedEvent(event)) {
		return;
	}

	if (event.code !== KEY_CODE_END && event.code !== KEY_CODE_HOME) {
		removeKey();
	}
}

/**
 * Resets `window.key_pressed` to "no key held", and on Linux also re-arms
 * `window.stop_menu` to false so the native context menu is no longer suppressed once the
 * key that was enabling it has been released.
 *
 * @returns {void}
 */
export function removeKey(): void {
	// turn menu on for linux
	if (window.os === OS_LINUX) {
		window.stop_menu = false;
	}
	window.key_pressed = 0;
}

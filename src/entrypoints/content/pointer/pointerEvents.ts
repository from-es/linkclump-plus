import {
	KEY_CODE_SHIFT,
	KEY_CODE_CTRL,
	KEY_CODE_ALT,
	KEY_CODE_META
} from "@/assets/js/constants/keyboard";
import { TOUCH_HOLD_TIMEOUT_MS } from "@/assets/js/constants/timing";
import { DRAG_THRESHOLD_MIN_PX } from "@/assets/js/constants/ui";
import { isTrustedEvent } from "../utils/isTrustedEvent";
import {
	computeStopMenuOnPointerDown,
	findMatchingMouseKeySetting,
	findTouchSettingId
} from "../matching/allowSelection";
import { startSelection } from "../selection/lifecycle";
import {
	armTouchHold,
	cancelTouchHold,
	getArmedTouchHold,
	isTouchHoldArmed,
	shouldCancelOnMove
} from "../touch/touchHold";

/**
 * The always-on entry point for every pointer press on the page. Records the pointer type
 * and button, re-syncs the held modifier key from the event, and decides synchronously
 * whether the native context menu should be suppressed (see computeStopMenuOnPointerDown).
 * For touch input with no physical key held, arms a 500ms hold timer instead of starting
 * the selection immediately, so the gesture can still be a normal scroll/tap if released
 * or moved before the hold is confirmed; once confirmed, startSelection() is called. For
 * mouse input (or touch with a key already held), startSelection() is called right away.
 *
 * @param {PointerEvent} event - The pointerdown event.
 * @returns {void}
 */
export function pointerdown(event: PointerEvent): void {
	if (!isTrustedEvent(event)) {
		return;
	}

	window.pointer_type = event.pointerType;
	window.mouse_button = event.button;

	// Sync modifier keys from pointer event
	if (event.metaKey) {
		window.key_pressed = KEY_CODE_META;
	} else if (event.ctrlKey) {
		window.key_pressed = KEY_CODE_CTRL;
	} else if (event.shiftKey) {
		window.key_pressed = KEY_CODE_SHIFT;
	} else if (event.altKey) {
		window.key_pressed = KEY_CODE_ALT;
	}

	// Decide synchronously whether this pointerdown should suppress the native context menu,
	// without waiting for pointermove/start() to cross the drag threshold - by the time that
	// threshold is crossed, macOS/Linux have already fired `contextmenu`. See
	// matching/allowSelection.ts's computeStopMenuOnPointerDown for the OS-specific rationale.
	const pointerState = {
		os: window.os,
		mouseButton: event.button,
		ctrlKey: event.ctrlKey,
		keyPressed: window.key_pressed,
		pointerType: event.pointerType
	};
	const stopMenuDecision = computeStopMenuOnPointerDown(pointerState, findMatchingMouseKeySetting(pointerState));
	if (stopMenuDecision !== null) {
		window.stop_menu = stopMenuDecision;
	}

	// Handle pure touch input with no physical keyboard modifier held
	if (event.pointerType === "touch" && window.key_pressed === 0) {
		// discard a hold that is still pending (e.g. a second finger touched down), regardless
		// of whether this new touch is itself primary
		cancelTouchHold();

		// extra fingers (pinch/zoom) never start a hold gesture nor disturb a running selection
		if (!event.isPrimary) {
			return;
		}

		window.touch_active = false;

		// arm the hold only when a left-click action exists that touch could trigger
		if (findTouchSettingId() === undefined) {
			return;
		}

		const startX = event.pageX;
		const startY = event.pageY;
		const pointerId = event.pointerId;

		const removeHoldListeners = () => {
			window.removeEventListener("pointermove", cancelTouchOnMove, true);
			window.removeEventListener("pointerup", cancelTouchOnEnd, true);
			window.removeEventListener("pointercancel", cancelTouchOnEnd, true);
		};

		const cancelTouchOnEnd = () => {
			cancelTouchHold();
		};

		const cancelTouchOnMove = (moveEvent: PointerEvent) => {
			if (shouldCancelOnMove(getArmedTouchHold(), pointerId, moveEvent.pageX, moveEvent.pageY, DRAG_THRESHOLD_MIN_PX)) {
				cancelTouchOnEnd();
			}
		};

		window.addEventListener("pointermove", cancelTouchOnMove, true);
		window.addEventListener("pointerup", cancelTouchOnEnd, true);
		window.addEventListener("pointercancel", cancelTouchOnEnd, true);

		armTouchHold(
			pointerId,
			event.isPrimary,
			startX,
			startY,
			() => {
				removeHoldListeners();

				window.touch_active = true;
				if (startSelection(event, startX, startY)) {
					if (typeof navigator.vibrate === "function") {
						navigator.vibrate(30);
					}
				} else {
					// no action matched: hand the gesture back to the browser (scroll, native menu)
					window.touch_active = false;
				}
			},
			TOUCH_HOLD_TIMEOUT_MS,
			removeHoldListeners
		);

		return;
	}

	startSelection(event, event.pageX, event.pageY);
}

/**
 * Suppresses the browser's native context menu whenever `window.stop_menu` says the
 * current pointerdown's button+key combination is being used for a selection, or while a
 * touch hold (pending or already confirmed) is in progress - covering both the desktop
 * right-click/long-press menu and mobile browsers' native touch-and-hold menu.
 *
 * @param {MouseEvent} event - The contextmenu event.
 * @returns {void}
 */
export function contextmenu(event: MouseEvent): void {
	if (!isTrustedEvent(event)) {
		return;
	}

	// Suppress the native long-press menu (e.g. Android Chrome) while a touch hold is pending or active
	const touchHoldInProgress = window.pointer_type === "touch" && (isTouchHoldArmed() || window.touch_active);

	if (window.stop_menu || touchHoldInProgress) {
		event.preventDefault();
	}
}

/**
 * Cancels native touch panning after the touch hold gesture has been confirmed,
 * so that the drag is handled as a link selection instead of a page scroll.
 * NOTE: `touch-action` is fixed at the start of a touch sequence, so it cannot be
 * switched to "none" after the 500ms hold. A non-passive `touchmove` listener is used instead.
 *
 * @param {TouchEvent} event - The touchmove event.
 * @returns {void}
 */
export function touchmove(event: TouchEvent): void {
	if (window.touch_active && event.cancelable) {
		event.preventDefault();
	}
}

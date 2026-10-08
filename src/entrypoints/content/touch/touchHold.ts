export interface ArmedTouchHold {
	pointerId: number;
	startX: number;
	startY: number;
}

let armed: ArmedTouchHold | null = null;
let timerId = 0;
let onConfirm: (() => void) | null = null;
let onCancel: (() => void) | null = null;

/**
 * Core hold-cancellation check (pure function, no DOM access).
 * Returns true only when the moved pointer is the one currently armed and it has moved
 * past the threshold. Checking pointerId prevents an unrelated finger's movement from
 * cancelling a hold it has nothing to do with.
 *
 * @param {ArmedTouchHold | null} current - The currently armed hold, if any.
 * @param {number} pointerId - The ID of the pointer that moved.
 * @param {number} x - The pointer's current X coordinate.
 * @param {number} y - The pointer's current Y coordinate.
 * @param {number} thresholdPx - The maximum allowed movement on either axis.
 * @returns {boolean} True if the armed pointer moved beyond the threshold; otherwise false.
 */
export function shouldCancelOnMove(
	current: ArmedTouchHold | null,
	pointerId: number,
	x: number,
	y: number,
	thresholdPx: number
): boolean {
	if (current === null || current.pointerId !== pointerId) {
		return false;
	}
	return Math.abs(x - current.startX) > thresholdPx || Math.abs(y - current.startY) > thresholdPx;
}

/**
 * Returns the currently armed hold state so callers can pass it into shouldCancelOnMove().
 *
 * @returns {ArmedTouchHold | null} The armed hold state, or null if no hold is pending.
 */
export function getArmedTouchHold(): ArmedTouchHold | null {
	return armed;
}

/**
 * Arms a pending hold, waiting for confirmFn to fire after timeoutMs. Any hold already
 * pending is cancelled first.
 *
 * Does nothing when isPrimary is false: this keeps a second or later finger from ever
 * arming a hold, as a guarantee of this module itself rather than something every
 * caller has to remember to filter for.
 *
 * @param {number} pointerId - The ID of the pointer that started the hold.
 * @param {boolean} isPrimary - Whether the pointer is the primary pointer.
 * @param {number} startX - The pointer's starting X coordinate.
 * @param {number} startY - The pointer's starting Y coordinate.
 * @param {() => void} confirmFn - The callback to run after the hold duration elapses.
 * @param {number} timeoutMs - The duration to wait before confirming the hold.
 * @param {() => void} [cancelFn] - Optional callback to run whenever the hold is cancelled (e.g. to clean up temporary listeners immediately).
 * @returns {void}
 */
export function armTouchHold(
	pointerId: number,
	isPrimary: boolean,
	startX: number,
	startY: number,
	confirmFn: () => void,
	timeoutMs: number,
	cancelFn?: () => void
): void {
	if (!isPrimary) {
		return;
	}
	cancelTouchHold();
	armed = { pointerId, startX, startY };
	onConfirm = confirmFn;
	onCancel = cancelFn ?? null;
	timerId = setTimeout(() => {
		const toConfirm = onConfirm;
		armed = null;
		timerId = 0;
		onConfirm = null;
		onCancel = null;
		toConfirm?.();
	}, timeoutMs);
}

/**
 * Cancels a pending hold, if any. A no-op when nothing is pending (idempotent).
 *
 * @returns {void}
 */
export function cancelTouchHold(): void {
	if (timerId !== 0) {
		clearTimeout(timerId);
		timerId = 0;
	}
	const toCancel = onCancel;
	armed = null;
	onConfirm = null;
	onCancel = null;
	toCancel?.();
}

/**
 * Reports whether a touch hold is currently pending confirmation.
 *
 * @returns {boolean} True if a hold is armed and waiting on its timer.
 */
export function isTouchHoldArmed(): boolean {
	return armed !== null;
}

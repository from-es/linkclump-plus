/**
 * Validates if the event is a trusted user gesture originating from the browser.
 *
 * This is a security measure to prevent Confused Deputy attacks where a malicious
 * webpage attempts to trigger privileged actions via synthesized DOM events.
 *
 * @param {Event} event - The DOM event to validate.
 * @returns {boolean} True if the event is trusted (user-initiated), false otherwise.
 */
export function isTrustedEvent(event: Event): boolean {
	return event?.isTrusted ?? false;
}

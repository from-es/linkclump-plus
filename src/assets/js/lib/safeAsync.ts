/**
 * This module provides utility functions for executing fire-and-forget tasks safely.
 * It handles both synchronous throws and Promise rejections to prevent
 * unhandled promise rejections and eliminate floating promises.
 *
 * ## Usage Guideline
 *
 * 1. Single-line task: Keep on one line when concise.
 *    ```ts
 *    safeAsync("openOptionsPage", () => browser.runtime.openOptionsPage(), "background");
 *    ```
 * 2. Multi-line inline task: Place each argument on a new line so the scope parameter remains clearly visible.
 *    ```ts
 *    safeAsync(
 *        "activate",
 *        () => browser.runtime.sendMessage({
 *            message: "activate",
 *            urls: open_tabs,
 *            setting: window.settings[window.setting]
 *        } as ActivateMessage),
 *        "content"
 *    );
 *    ```
 * 3. Complex task: Extract the callback into a dedicated variable.
 *    ```ts
 *    const sendActivateMessage = () => browser.runtime.sendMessage({ ... });
 *    safeAsync("activate", sendActivateMessage, "content");
 *    ```
 */

/**
 * Default scope prefix used in error logs when none is specified.
 */
const DEFAULT_SCOPE = "safeAsync";

/**
 * Checks whether an error is caused by the extension context being invalidated
 * (e.g. after the extension was reloaded or updated).
 *
 * @param {unknown} error - Error to inspect.
 * @returns {boolean} True if the error indicates context invalidation.
 */
function isExtensionContextInvalidated(error: unknown): boolean {
	return error instanceof Error && /Extension context invalidated/i.test(error.message);
}

/**
 * Runs a task in a fire-and-forget manner and logs any failure.
 * Handles both synchronous throws and Promise rejections.
 *
 * @param {string} taskName - Label used in the error log.
 * @param {() => unknown} task - Task to run (sync or async).
 * @param {string} [scope=DEFAULT_SCOPE] - Log prefix (e.g. for case of browser extension: "background" / "content" / "options").
 * @returns {void}
 */
export function safeAsync(taskName: string, task: () => unknown, scope: string = DEFAULT_SCOPE): void {
	void (async () => {
		await task();
	})().catch((error: unknown) => {
		if (isExtensionContextInvalidated(error)) {
			console.debug(`[${scope}] Skipped ${taskName}: the extension context is invalidated.`);
			return;
		}
		console.error(`[${scope}] Error in ${taskName}:`, error);
	});
}

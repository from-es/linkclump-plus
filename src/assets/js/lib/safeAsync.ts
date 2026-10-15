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
		console.error(`[${scope}] Error in ${taskName}:`, error);
	});
}

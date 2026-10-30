/**
 * Helper utility for Vitest smoke testing.
 *
 * @file
 */

/**
 * Add two numbers.
 *
 * @param {number} a - The first number.
 * @param {number} b - The second number.
 * @returns {number} The sum of the two numbers.
 */
export function add(a: number, b: number): number {
	return a + b;
}

/**
 * Creates and appends a test DOM element.
 *
 * @returns {HTMLDivElement} The created element.
 */
export function setupDomElement(): HTMLDivElement {
	const div = document.createElement("div");
	div.id = "smoke-test-container";
	div.textContent = "Vitest Smoke Test";
	document.body.appendChild(div);
	return div;
}

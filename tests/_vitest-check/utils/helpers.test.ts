/**
 * Smoke test for helpers utility and JSDOM environment.
 *
 * Verifies that the Vitest test execution environment and DOM simulation are functioning as expected.
 *
 * Standard `it` blocks are used instead of `TestRunner` on purpose: a smoke test must verify the
 * environment independently of the shared test infrastructure, so that a broken `TestRunner` cannot
 * mask (or be mistaken for) an environment problem.
 *
 * @file
 * @see {@link project/vitest.smoke.config.ts} - Smoke test settings
 */

import { describe, it, afterEach, beforeEach, expect } from "vitest";
import { add, setupDomElement } from "./helpers";

describe("Vitest Smoke Test", () => {
	beforeEach(() => {
		document.body.innerHTML = "";
	});

	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("should perform basic arithmetic correctly", () => {
		expect(add(1, 2)).toBe(3);
		expect(add(-5, 5)).toBe(0);
	});

	it("should interact with DOM elements correctly in JSDOM environment", () => {
		const el = setupDomElement();
		expect(el).not.toBeNull();
		expect(document.getElementById("smoke-test-container")).toBe(el);
		expect(el.textContent).toBe("Vitest Smoke Test");
	});
});

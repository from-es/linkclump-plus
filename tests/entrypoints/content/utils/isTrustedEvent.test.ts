/**
 * isTrustedEvent Tests
 *
 * Verifies that only browser-originated (trusted) events are accepted, and that missing events are rejected.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link project/tests/shared/types/validation.ts} - Standard type for validation tests
 */

import { describe } from "vitest";
import { isTrustedEvent } from "@/entrypoints/content/utils/isTrustedEvent";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

const testData = {
	successCases: [
		// `isTrusted` is read-only and cannot be set on real events, so plain objects stand in for them.
		{ name: "should return true for a trusted event", input: { isTrusted: true } as IntentionalAnyForValidation, expected: true },
		{ name: "should return false for an untrusted event", input: { isTrusted: false } as IntentionalAnyForValidation, expected: false },
		{ name: "should return false for a script-synthesized DOM event", input: new Event("click"), expected: false },
		{ name: "should return false for null", input: null as IntentionalAnyForValidation, expected: false },
		{ name: "should return false for undefined", input: undefined as IntentionalAnyForValidation, expected: false }
	]
} as const satisfies Record<string, readonly TestCase<Event, boolean>[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

describe("isTrustedEvent", () => {
	describe("Success cases", () => {
		TestRunner.success(testData.successCases, undefined, (event) => isTrustedEvent(event), { matcher: "toBe" });
	});
});

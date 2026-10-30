/**
 * dateFormatter Tests
 *
 * Verifies date formatting with the default and custom formats, and TypeError handling for invalid arguments.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link project/tests/shared/types/validation.ts} - Standard type for validation tests
 */

import { describe } from "vitest";
import { dateFormatter } from "@/assets/js/lib/dateFormatter";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

interface Input {
	readonly date: Date;
	readonly format?: string;
}

const VALID_DATE = new Date(2026, 0, 15, 14, 30, 45); // Jan 15 2026 14:30:45
const EVENING_DATE = new Date(2026, 9, 27, 23, 45, 0); // Oct 27 2026 23:45:00

const testData = {
	successCases: [
		{ name: "should format valid Date with default format YYYYMMDDThhmmss", input: { date: VALID_DATE }, expected: "20260115T023045" },
		{ name: "should format valid Date with custom format (date and time)", input: { date: EVENING_DATE, format: "YYYY-MM-DD_HH-mm-ss" }, expected: "2026-10-27_23-45-00" },
		{ name: "should format valid Date with custom format (date only)", input: { date: EVENING_DATE, format: "YYYY/MM/DD" }, expected: "2026/10/27" }
	],
	errorCases: [
		{ name: "should throw TypeError for non-Date argument", input: { date: "2026-01-01" as IntentionalAnyForValidation }, expected: TypeError },
		{ name: "should throw TypeError for invalid Date (NaN)", input: { date: new Date("invalid-date-string") }, expected: TypeError },
		{ name: "should throw TypeError for non-string format", input: { date: VALID_DATE, format: 123 as IntentionalAnyForValidation }, expected: TypeError },
		{ name: "should throw TypeError for empty format string", input: { date: VALID_DATE, format: "" }, expected: TypeError },
		{ name: "should throw TypeError for whitespace-only format string", input: { date: VALID_DATE, format: "   " }, expected: TypeError }
	]
} as const satisfies Record<string, readonly TestCase<Input>[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

describe("dateFormatter", () => {
	describe("Success cases", () => {
		TestRunner.success(testData.successCases, undefined, ({ date, format }: Input) => dateFormatter(date, format), { matcher: "toBe" });
	});

	describe("Error handling", () => {
		TestRunner.error(testData.errorCases, undefined, ({ date, format }: Input) => dateFormatter(date, format));
	});
});

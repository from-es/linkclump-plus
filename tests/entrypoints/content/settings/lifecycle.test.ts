/**
 * Content script lifecycle Tests
 *
 * Verifies that applySettings enables or disables the content script (custom elements in the DOM)
 * depending on the blocklist, including dynamic changes without a page reload.
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 * @see {@link project/tests/shared/types/validation.ts} - Standard type for validation tests
 */

// @vitest-environment-options { "url": "https://example.com/test-page" }

import { describe, afterEach, beforeEach, vi } from "vitest";
import { applySettings } from "@/entrypoints/content/settings/applySettings";
import { CUSTOM_TAG_LINKCLUMP } from "@/assets/js/constants/ui";
import type { Settings } from "@/assets/js/types/Settings";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";
import { type IntentionalAnyForValidation } from "../../../shared/types";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

type ApplicableSettings = Pick<Settings, "actions" | "blocked">;

interface StepsInput {
	/** Settings applied in order. The page URL is https://example.com/test-page. */
	readonly steps: readonly ApplicableSettings[];
}

// A partial action object is enough: only the blocklist decides whether the content script is enabled.
const ACTIVE_ACTIONS: ApplicableSettings["actions"] = { 101: {} as IntentionalAnyForValidation };

const testData = {
	// Expected: whether the custom element exists in the DOM after each step
	presenceCases: [
		{
			name: "should enable content script and append custom elements to DOM when not blocked",
			input: { steps: [ { actions: ACTIVE_ACTIONS, blocked: [ "other-domain\\.com" ] } ] },
			expected: [ true ]
		},
		{
			name: "should disable content script and remove DOM elements when settings update to match blocklist",
			input: {
				steps: [
					{ actions: ACTIVE_ACTIONS, blocked: [] },
					{ actions: ACTIVE_ACTIONS, blocked: [ "example\\.com" ] }
				]
			},
			expected: [ true, false ]
		},
		{
			name: "should re-enable dynamically when blocklist rule is removed without page reload",
			input: {
				steps: [
					{ actions: {}, blocked: [ "example\\.com" ] },
					{ actions: {}, blocked: [] }
				]
			},
			expected: [ false, true ]
		}
	],
	globalHandleCases: [
		{
			name: "should expose linkclump, box and count_label on window when enabled",
			input: { steps: [ { actions: ACTIVE_ACTIONS, blocked: [ "other-domain\\.com" ] } ] },
			expected: { linkclumpIsElement: true, boxDefined: true, countLabelDefined: true }
		}
	]
} as const satisfies Record<string, readonly TestCase<StepsInput>[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

describe("Content script lifecycle and blocklist coordination", () => {
	beforeEach(() => {
		// Arrange: Empty DOM and silenced blocklist logging
		document.body.innerHTML = "";
		vi.spyOn(console, "info").mockImplementation(() => {});
	});

	afterEach(() => {
		// Cleanup: Disable the content script by applying a blocking setting, then restore the environment
		applySettings({ actions: {}, blocked: [ ".*" ] });
		document.body.innerHTML = "";
		vi.restoreAllMocks();
	});

	describe("Custom element presence", () => {
		TestRunner.success(testData.presenceCases, undefined, ({ steps }: StepsInput) => {
			return steps.map((settings) => {
				applySettings(settings);

				return document.querySelector(CUSTOM_TAG_LINKCLUMP) !== null;
			});
		});
	});

	describe("Global handles", () => {
		TestRunner.success(testData.globalHandleCases, undefined, ({ steps }: StepsInput) => {
			steps.forEach((settings) => applySettings(settings));
			const el = document.querySelector(CUSTOM_TAG_LINKCLUMP);

			return {
				linkclumpIsElement: el !== null && window.linkclump === el,
				boxDefined: window.box !== undefined,
				countLabelDefined: window.count_label !== undefined
			};
		});
	});
});

/**
 * Data-driven test execution engine.
 *
 * Separates test data ("what") from execution logic ("how"). Each case in a data array
 * becomes one `it` block, following the Arrange → Act → Assert pattern.
 *
 * @file
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 */

import { it, expect } from "vitest";

/**
 * A single data-driven test case.
 *
 * @template I - Input passed to the target function.
 * @template E - Expected result (or the expected error for error cases).
 */
export interface TestCase<I = unknown, E = unknown> {
	/** Test title shown in the reporter. */
	readonly name: string;
	/** Input passed to the target function. */
	readonly input: I;
	/** Expected result for success cases, or expected error (message / class / RegExp) for error cases. */
	readonly expected: E;
}

/**
 * Context given to the target function.
 *
 * Because test cases are registered while `describe` is being collected (before `beforeEach` runs),
 * pass either an object that `beforeEach` mutates or a getter function that is resolved lazily
 * when each test runs.
 */
export type TestContext<C> = C | (() => C);

/** Matchers available for success cases. */
export type SuccessMatcher = "toBe" | "toEqual" | "toStrictEqual" | "toMatchObject";

/** Options for {@link TestRunner.success}. */
export interface SuccessOptions {
	/** Matcher used to compare the actual and expected values. Defaults to `toEqual`. */
	readonly matcher?: SuccessMatcher;
}

/** Expected error accepted by {@link TestRunner.error}. */
export type ExpectedError = string | RegExp | (new (...args: never[]) => Error) | Error;

/**
 * Target function signature. May be synchronous or asynchronous.
 *
 * @template T - Test case type (the union of all literal case types in a data array).
 * @template C - Context type.
 */
export type TargetFn<T extends TestCase, C> = (input: T["input"], context: C, testCase: T) => unknown;

/**
 * Resolves a lazily provided context.
 *
 * @param {TestContext<C>} context - Context object or getter.
 * @returns {C} The resolved context.
 */
function resolveContext<C>(context: TestContext<C>): C {
	return typeof context === "function" ? (context as () => C)() : context;
}

/**
 * Static utility that registers data-driven test cases.
 */
export class TestRunner {
	/**
	 * Registers one `it` per case and asserts that the target returns (or resolves to) `expected`.
	 *
	 * @param {readonly T[]} cases - Test cases.
	 * @param {TestContext<C>} context - Context (object or getter) passed to the target.
	 * @param {TargetFn<T, C>} fn - Target function wrapper (Act).
	 * @param {SuccessOptions} [options] - Matcher options.
	 */
	static success<T extends TestCase, C>(
		cases: readonly T[],
		context: TestContext<C>,
		fn: TargetFn<T, C>,
		options: SuccessOptions = {}
	): void {
		const matcher = options.matcher ?? "toEqual";
		for (const testCase of cases) {
			it(testCase.name, async () => {
				const actual = await fn(testCase.input, resolveContext(context), testCase);
				switch (matcher) {
					case "toBe":
						expect(actual).toBe(testCase.expected);
						break;
					case "toStrictEqual":
						expect(actual).toStrictEqual(testCase.expected);
						break;
					case "toMatchObject":
						expect(actual).toMatchObject(testCase.expected as object);
						break;
					default:
						expect(actual).toEqual(testCase.expected);
				}
			});
		}
	}

	/**
	 * Registers one `it` per case and asserts that the target throws (or rejects with) `expected`.
	 *
	 * @param {readonly T[]} cases - Test cases.
	 * @param {TestContext<C>} context - Context (object or getter) passed to the target.
	 * @param {TargetFn<T, C>} fn - Target function wrapper (Act).
	 */
	static error<T extends TestCase<unknown, ExpectedError>, C>(
		cases: readonly T[],
		context: TestContext<C>,
		fn: TargetFn<T, C>
	): void {
		for (const testCase of cases) {
			it(testCase.name, async () => {
				const ctx = resolveContext(context);
				// Wrapping in an async function unifies synchronous throws and asynchronous rejections.
				await expect((async () => fn(testCase.input, ctx, testCase))()).rejects.toThrow(testCase.expected);
			});
		}
	}
}

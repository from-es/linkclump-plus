/**
 * Semantic types for validation tests.
 *
 * Runtime validation tests must intentionally pass values that TypeScript's static analysis would
 * normally reject. Use {@link IntentionalAnyForValidation} instead of a bare `any` so that the intent
 * is explicit and the ESLint suppression is centralized in this single file.
 *
 * @file
 */

/**
 * A deliberately untyped value used to bypass static type checking in validation tests.
 *
 * @example
 * isSettings(null as IntentionalAnyForValidation);
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type IntentionalAnyForValidation = any;

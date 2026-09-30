import type { OsType } from "@/assets/js/types/OS";

/**
 * OS classification identifier used for OS-specific behavior branching.
 */
export const OS_WIN = 0 as const satisfies OsType;
export const OS_LINUX = 1 as const satisfies OsType;
export const OS_MAC = 2 as const satisfies OsType;

// Exhaustive check: verify that all values of union OsType are covered by OS_* constants
type _Exhaustive = OsType extends typeof OS_WIN | typeof OS_LINUX | typeof OS_MAC ? true : never;
const _check: _Exhaustive = true;
void _check;

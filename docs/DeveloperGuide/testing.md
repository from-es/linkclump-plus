# Testing

This project uses [Vitest](https://vitest.dev/) for automated unit and integration tests, and a set of static HTML pages for manual functional tests.

## Test assets overview

| Path | Content | Status |
| :--- | :--- | :--- |
| `tests/assets/` | Unit tests for shared modules under `src/assets/js/` | Active |
| `tests/entrypoints/` | Tests for background, content, and Options page logic | Active |
| `tests/shared/` | Shared test infrastructure (engine, setup, fixtures, types) | Active |
| `tests/_vitest-check/` | Smoke tests that verify the test environment itself | Active (excluded from the main run) |
| `tests/page/` | Static HTML pages for manual functional tests | Active; used in [Quality assurance](./quality-assurance.md) |

The legacy unit tests that were inherited from the original Linkclump (`tests/code/`) have been removed. They used the `TestCase` API of JsTestDriver and the old `SettingsManager` API, and no longer matched the current code.

---

## Running tests

Run `npm` commands from the repository root (the directory that contains `package.json`).

| Command | Description |
| :--- | :--- |
| `npm run vitest` | Start watch mode. Tests re-run when source files change. |
| `npm run vitest:run` | Run all tests once and exit. |
| `npm run vitest:ui` | Open the Vitest browser UI for interactive result browsing. |
| `npm run vitest:coverage` | Run all tests and generate a coverage report under `coverage/`. |
| `npm run vitest:smoke` | Run only the smoke tests in `tests/_vitest-check/` to verify the test environment. |

When all tests pass, `vitest:run` exits with code 0 and prints a summary such as `X passed, 0 failed`.

> [!NOTE]
> The smoke test command uses a separate config file (`vitest.smoke.config.ts`). It is useful after a dependency update to confirm that the environment itself is working before running the full suite.

---

## Test infrastructure

### Configuration

The main configuration is in `vitest.config.ts` at the project root. Key settings:

- **Environment:** `jsdom` — simulates a browser DOM for content script tests.
- **Pool:** `vmThreads` — each test file runs in its own VM context for isolation.
- **Setup file:** `tests/shared/support/setup.ts` — runs before every test file and sets up shared mocks.
- **Include:** `src/**/*.test.{js,ts}` and `tests/**/*.test.{js,ts}`.
- **Exclude:** `tests/_vitest-check/**` and `tests/page/**` (the smoke tests and manual pages are excluded from the main run).

### Shared mocks (`tests/shared/support/setup.ts`)

This file runs automatically before every test file. It mocks `wxt/browser` with stub implementations of all browser APIs (tabs, storage, scripting, windows, and runtime) using `vi.fn()`. It also stubs `URL.createObjectURL` and `URL.revokeObjectURL` for JSDOM.

Each test that needs a specific return value calls `mockResolvedValue()` or `mockReturnValue()` on the stub. Don't set permanent return values in `setup.ts`; keep it neutral.

### Test execution engine (`tests/shared/support/TestRunner.ts`)

`TestRunner` separates test data from execution logic. Each case in a data array becomes one `it` block.

| Method | Use case |
| :--- | :--- |
| `TestRunner.success(cases, context, fn, options?)` | Asserts that the target returns (or resolves to) `expected`. |
| `TestRunner.error(cases, context, fn)` | Asserts that the target throws (or rejects with) `expected`. |

The `context` argument can be an object or a getter function `() => T`. Use a getter when the context is initialized in `beforeEach` (because test cases are registered before `beforeEach` runs).

### Content window helper (`tests/shared/support/contentWindow.ts`)

`resetContentWindow()` resets all `window.*` globals that the content script uses (selection state, keyboard state, DOM elements) to a neutral idle state. Call it in `beforeEach` for content script tests.

### Types (`tests/shared/types/`)

`IntentionalAnyForValidation` is the project's semantic type for bypassing static type checking in validation tests. Use it instead of a bare `as any`:

```typescript
import { type IntentionalAnyForValidation } from "../../../shared/types";

isSettings(null as IntentionalAnyForValidation); // intentional: testing runtime rejection
```

---

## Writing new tests

### Directory structure

Mirror the `src/` structure under `tests/`:

```text
tests/
├── assets/js/lib/   ← tests for src/assets/js/lib/
├── entrypoints/
│   ├── background/  ← tests for src/entrypoints/background/
│   ├── content/     ← tests for src/entrypoints/content/
│   └── options/     ← tests for src/entrypoints/options/
└── shared/          ← shared test infrastructure (don't add tests here)
```

Name test files `<module>.test.ts`.

### Test template

Use this template as a starting point:

```typescript
/**
 * {{Module Name}} Tests
 *
 * {{Brief description of the test's purpose.}}
 *
 * @file
 * @see {@link project/vitest.config.ts} - Global settings
 * @see {@link project/tests/shared/support/setup.ts} - Shared mocks
 * @see {@link project/tests/shared/support/TestRunner.ts} - Test execution engine
 */

import { describe, beforeEach, expect, vi } from "vitest";
import { TestRunner, type TestCase } from "../../../shared/support/TestRunner";

// =============================================================================
// 1. Test Data (Separation of Data and Logic)
// =============================================================================

const testData = {
  successCases: [
    { name: "should ...", input: { val: 1 }, expected: 2 }
  ],
  errorCases: [
    { name: "should throw on ...", input: null, expected: "Error message" }
  ]
} as const satisfies Record<string, readonly TestCase[]>;

// =============================================================================
// 2. Orchestration (Structure)
// =============================================================================

describe("ModuleName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Success cases", () => {
    TestRunner.success(testData.successCases, undefined, (input) => {
      // return targetFunction(input);
    });
  });

  describe("Error handling", () => {
    TestRunner.error(testData.errorCases, undefined, (input) => {
      // targetFunction(input);
    });
  });
});
```

> [!NOTE]
> The relative paths in the template and in the example above (`../../../shared/...`) are for a test file in a directory such as `tests/assets/js/lib/` or `tests/entrypoints/background/actions/`. Adjust the number of `../` to the depth of your test file. For example, a test file directly in `tests/entrypoints/options/` uses `../../shared/...`.

### Import convention

Normalize Vitest imports into these four categories, in order:

1. **Structure:** `describe`, `it`, `test`, `suite`
2. **Lifecycle:** `beforeAll`, `beforeEach`, `afterEach`, `afterAll`
3. **Assertion:** `expect`, `assert`
4. **Utility:** `vi`

Example: `import { describe, it, beforeEach, afterEach, expect, vi } from "vitest";`

### When not to use `TestRunner`

If a test requires strict async sequencing or interleaved assertions that don't fit the data-driven pattern, use a plain `it` block. Add a comment in the file's JSDoc explaining why `TestRunner` wasn't used.

### Coverage goals

| Scope | Goal |
| :--- | :--- |
| `src/assets/js/lib/` | > 80% line coverage |
| `src/assets/js/lib/` + `src/**/utils/` overall | > 75% line coverage |

Run `npm run vitest:coverage` to check the current numbers. The command generates a report under `coverage/`; open `coverage/index.html` in a browser to see the full breakdown. Coverage excludes third-party code (`src/assets/js/lib/colorpicker/`), type-only files, and WXT entry points.

---

## Manual tests with `tests/page/`

The static pages in `tests/page/` test visual and interactive behavior that automated tests can't cover. Run them as part of [Quality assurance](./quality-assurance.md).

1. Build the extension in development mode and load it in the browser. See [Build and installation](./build-and-install.md).
2. Open `tests/page/index.html` in the browser. To use the extension on a `file://` page, turn on access to file URLs for the extension. Alternatively, serve the directory over `http`.
3. Open each test page and drag-select the links. Check that the selected links and the counter match the links you expect from the description on that page.

The `playground/index.html` page in the extension package (source: `src/public/playground/`) is a page with a few sample links for trying the Actions quickly.

# Tests Directory

This directory contains the automated test suite and the manual test pages for Linkclump Plus. For detailed guidelines on how to write tests, design patterns (AAA, Data-Driven), templates, and coverage goals, see the [Testing developer guide](../docs/DeveloperGuide/testing.md). For the overall repository architecture, see [Architecture](../docs/DeveloperGuide/architecture.md).

---

## Directory Structure

The test suite is organized to mirror the source tree under `src/`, with shared infrastructure kept separately.

```text
tests/
├── assets/           # Tests for shared modules (src/assets/js/)
│   └── js/lib/       # Tests for core library functions
├── entrypoints/      # Tests for extension entry points (mirroring src/entrypoints/)
│   ├── background/   # Tests for the background process
│   ├── content/      # Tests for the content script
│   └── options/      # Tests for the Options page logic
├── shared/           # Shared test infrastructure (do not add test files here)
│   ├── support/      # TestRunner, global mocks setup, window reset helper
│   ├── fixtures/     # Static JSON test data and factory functions
│   └── types/        # Test-specific types (e.g. IntentionalAnyForValidation)
├── _vitest-check/    # Smoke tests for the test environment (excluded from main run)
└── page/             # Static HTML pages for manual functional tests
```

- **`assets/`**: Tests for shared modules under `src/assets/js/`.
  - **`js/lib/`**: Tests for core library functions (`detectBrowser`, `detectOs`, `safeAsync`, `regexp`, `SettingsGuard`, `SettingsFileManager`, and so on).
- **`entrypoints/`**: Tests for extension entry point modules.
  - **`background/`**: Background process (actions, init, messaging, scripts, settings, utils).
  - **`content/`**: Content script (dom, keyboard, matching, pointer, selection, settings, touch, utils).
  - **`options/`**: Options page logic.
- **`shared/`**: Shared test infrastructure. Don't add test files here.
  - **`support/`**: `TestRunner.ts` (data-driven engine), `setup.ts` (global mocks), `contentWindow.ts` (content-script window reset helper).
  - **`fixtures/`**: Static JSON data or factory functions for complex test objects.
  - **`types/`**: `validation.ts` — the `IntentionalAnyForValidation` semantic type.
- **`_vitest-check/`**: Environment smoke tests. Validates that the Vitest configuration and setup are working correctly. Excluded from the main test run.
- **`page/`**: Static HTML pages for manual functional tests. Used in the [Quality assurance checklist](../docs/DeveloperGuide/quality-assurance.md). Excluded from the automated test run.

---

## Running Tests

Run all commands from the `project/` directory (the directory that contains `package.json`).

### Automated tests

```bash
# Run all tests once
npm run vitest:run

# Run in watch mode (recommended for active development)
npm run vitest

# Open the Vitest browser UI
npm run vitest:ui

# Generate a coverage report under coverage/
npm run vitest:coverage
```

When all tests pass, `vitest:run` exits with code 0 and prints a summary such as `X passed, 0 failed`.

### Environment smoke tests

Use this command to verify that the Vitest environment is configured correctly, for example after updating dependencies.

```bash
npm run vitest:smoke
```

### Manual tests

Before running manual tests, build the extension and load it in the browser. See [Build and installation](../docs/DeveloperGuide/build-and-install.md) for instructions.

Open `tests/page/index.html` in a browser with the extension loaded. See the [Quality assurance checklist](../docs/DeveloperGuide/quality-assurance.md) for the full procedure.

---

## Writing Standards

All new tests must follow the project standards:

1. **Pattern**: Use the **AAA (Arrange-Act-Assert)** pattern.
2. **Logic**: Prefer **Data-Driven Testing** using the shared `TestRunner`.
3. **Template**: Start from the **Master Test Template** in the [Testing developer guide](../docs/DeveloperGuide/testing.md).
4. **Location**: Mirror the `src/` structure. Name files `<module>.test.ts`.
5. **Coverage**: Check coverage after changes with `npm run vitest:coverage`. See the coverage goals in the [Testing developer guide](../docs/DeveloperGuide/testing.md#coverage-goals).

# ESLint: Enforce code quality and style

This document describes the ESLint configuration and the coding conventions of this project. Following these guidelines keeps the codebase consistent and maintainable.

---

## Overview

This project uses [ESLint](https://eslint.org/) for static analysis to detect problems early. The configuration is in [`eslint.config.js`](../../eslint.config.js) at the project root.

The current setup includes:

- **TypeScript support**: Lints TypeScript code via `typescript-eslint`.
- **Stylistic rules**: Enforces formatting conventions via `@stylistic/eslint-plugin`.
- **Recommended rule sets**: Applies the recommended configs from `@eslint/js` and `typescript-eslint`.
- **Custom rules**: Defines project-specific rules for code correctness and style.

> [!NOTE]
> For the complete list of all configurations, plugins, and globals, see [`eslint.config.js`](../../eslint.config.js).

---

## Run ESLint

### Lint source and test directories

To check the `src/` and `tests/` directories, run:

```bash
npm run eslint
```

If there are no problems, the command exits without output and returns code 0.

### Lint a single file

To check one file, pass its path to `npx`:

```bash
npx eslint "src/entrypoints/background/index.ts"
```

---

## Files that ESLint ignores

`eslint.config.js` excludes the following paths:

- `.output/`, `.wxt/`, and `coverage/` (generated files)
- `material/` (reference material)
- `src/assets/js/lib/colorpicker/` (third-party code)
- `tests/page/` (manual test pages)

## Custom rules

### Code correctness and safety

| Rule | Setting | Description |
| :--- | :--- | :--- |
| `eqeqeq` | `"error"` | Requires `===` and `!==` (disallows `==` / `!=`). |
| `curly` | `"error"` | Requires curly braces for all control flow statements. |
| `no-unused-vars` | `"warn"` | Warns on variables that are declared but never used. |
| `prefer-const` | `"warn"` | Warns when a `let` variable is never reassigned. |
| `no-console` | `"error"` (except log levels) | Disallows `console.log`. Allows `warn`, `error`, `info`, `debug`, `trace`. |

### TypeScript-specific rules

| Rule | Setting | Description |
| :--- | :--- | :--- |
| `@typescript-eslint/no-unused-vars` | `"warn"` | Warns on unused variables in TypeScript files (overrides the core rule). |
| `@typescript-eslint/no-explicit-any` | `"warn"` | Warns when `any` is used explicitly. |
| `@typescript-eslint/no-floating-promises` | `"warn"` | Warns on unhandled Promises (missing `await` or `.catch()`). For fire-and-forget calls, use `safeAsync`. See [Async and error handling](./async-and-error-handling.md). |

> [!NOTE]
> `no-floating-promises` needs type information, so ESLint runs with `projectService` for TypeScript files. Linting TypeScript is therefore slower than linting JavaScript.
### Style and formatting rules

| Rule | Setting | Description |
| :--- | :--- | :--- |
| `@stylistic/indent` | `["error", "tab", { SwitchCase: 1 }]` | Enforces tab indentation. `case` clauses are indented one level inside `switch`. |
| `@stylistic/quotes` | `["error", "double", { avoidEscape: true, allowTemplateLiterals: "always" }]` | Enforces double quotes. A single-quoted string is allowed if it avoids escaping. Template literals are always allowed. |
| `@stylistic/semi` | `["error", "always"]` | Requires semicolons at the end of statements. |
| `@stylistic/comma-style` | `["error", "last"]` | Requires commas at the end of the line (not the beginning). |
| `@stylistic/linebreak-style` | `["error", "unix"]` | Enforces Unix (LF) line endings. |
| `@stylistic/eol-last` | `["error", "always"]` | Requires a newline at the end of every file. |
| `@stylistic/max-len` | `"off"` | Disables the maximum line length check. |
| `@stylistic/no-inline-comments` | `"off"` | Allows inline comments after code. |

### Whitespace rules

| Rule | Setting | Description |
| :--- | :--- | :--- |
| `@stylistic/array-bracket-spacing` | `["error", "always"]` | Requires spaces inside array brackets. Example: `[ 1, 2 ]` |
| `@stylistic/block-spacing` | `["error", "always"]` | Requires spaces inside single-line block statements. |
| `@stylistic/function-call-spacing` | `["error", "never"]` | Disallows spaces between function name and call parentheses. |
| `@stylistic/no-trailing-spaces` | `"error"` | Disallows trailing whitespace at the end of lines. |
| `@stylistic/space-before-blocks` | `["error", "always"]` | Requires a space before block statements. |
| `@stylistic/spaced-comment` | `["error", "always"]` | Requires a space immediately after the comment delimiter. |
| `@stylistic/no-multiple-empty-lines` | `max: 3, maxEOF: 0` | Allows up to 3 consecutive blank lines; disallows blank lines at end of file. |

---

## Development tooling

### VS Code extension

To see ESLint errors and warnings in the editor, install the following extension:

| Extension | Description |
| :--- | :--- |
| [ESLint for VS Code](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) | Displays ESLint diagnostics in the editor and provides auto-fix support. |

### VS Code settings (auto-fix on save)

To apply ESLint fixes automatically when you save a file, add the following to your VS Code settings (`.vscode/settings.json` or your user settings). The repository's `.vscode/settings.json` doesn't include these keys.

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "typescript"
  ]
}
```

---

## Official documentation

- [ESLint](https://eslint.org/)
- [ESLint Docs](https://eslint.org/docs/latest/)
- [typescript-eslint](https://typescript-eslint.io/)
- [@stylistic/eslint-plugin](https://eslint.style/)

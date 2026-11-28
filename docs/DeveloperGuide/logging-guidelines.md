# Logging guidelines

This document defines the standards for console output in this project.

Ensuring searchability, consistency, and information transparency in development and debugging logs is essential for long-term maintainability. This project adopts a standardized logging approach based on the following principles:

- **Leverage DevTools capabilities**: Rely on browser DevTools (Chrome DevTools, etc.) built-in level-based coloring, icons, and filtering. Avoid redundant text decoration.
- **Balance observability and noise suppression**: Retain information necessary for development and production troubleshooting while keeping the console free of red error text during normal user sessions.
- **Clear method selection criteria**: Strict usage of appropriate log levels (`trace` / `debug` / `info` / `warn` / `error`) based on severity.
- **Unified format**: Standardized message structure that enables easy machine parsing and text search.
- **Improved traceability**: Explicit context and status in messages to reduce time-to-diagnosis.
- **Protect sensitive information**: Ensure that production console output does not become an unintended information leak vector.

> [!NOTE]
> The ESLint rule `no-console` disallows `console.log`. Only `warn`, `error`, `info`, `debug`, and `trace` are permitted.

---

## 1. Log level criteria

### `console.error`: fatal failures and process termination

- Initialization failure (unable to proceed)
- Missing required data or configuration causing a process abort
- Catch blocks for unhandled exceptions, and global handlers such as `unhandledrejection` for uncaught promise rejections

**Examples:**

- Background returns `null` in response to an init message
- Settings file read/write failure
- No matching action configuration found, so the drag is aborted

---

### `console.warn`: recoverable anomalies and cautionary notices

- Fallback to a default value
- Unexpected setting value or type mismatch (processing continues)
- Skipping script injection into restricted-access tabs
- Final failure after retries — may affect subsequent operations

**Examples:**

- Setting value is outside the expected numeric range
- Manifest fetch failure, falling back to a default value
- User settings failed to load; reverting to defaults

---

### `console.info`: expected state changes and feature control

- Normal feature bypass or disabling based on user configuration
- Key lifecycle events

**Examples:**

- Feature disabled on the current site due to a matching blocklist pattern

---

### `console.debug`: development and troubleshooting detail

- High-frequency events or internal messaging traces
- Internal errors that are expected by design and have no user-visible impact (for example, send failures to tabs without an injected content script, where a retry or alternate path exists and no harm results)

**Examples:**

- "Connection not established" error when sending an update message to a tab with no content script injected

> [!TIP]
> **`warn` versus `debug`**
>
> - If the failure causes a visible change in behavior for the user, or affects subsequent processing → `warn`
> - If it is high-frequency, expected by spec, and requires no action on its own → `debug`
>
> When in doubt, leave a comment in the code explaining the rationale.

---

### `console.trace`: call site and call stack identification

- When a function appears to be called from an unexpected code path and you need to trace back to the caller
- Deep call chains where `debug` output alone is insufficient to identify the execution route

> [!NOTE]
> **`debug` versus `trace`**
>
> `debug` is for recording **state and internal communication content**; `trace` is for recording **where a call originated (the call stack)**. If state values alone are sufficient, use `debug`. If the call path itself is the subject of investigation, use `trace`.
>
> `trace` can produce large amounts of output. Once the investigation is complete, replace it with an appropriate level or remove it. Like `console.log`, it should not remain in committed code permanently.

---

### `console.log`: prohibited

Use one of the levels above. `console.log` is permitted only during local debugging sessions and must be changed or removed before committing.

---

## 2. Logging responsibility by architectural layer

To enforce separation of concerns (SoC) between architectural layers, the following rules apply to error handling and logging.

### Utility layer (`assets/js/lib/` and `assets/js/constants/`)

- **`console.error` is prohibited** in this layer.
- On validation failure or unrecoverable state, use `throw` to propagate the exception to the caller.
- If internal state output is needed for diagnosis, use `console.debug` — not `console.error`.

> [!NOTE]
> **Exception for `safeAsync`**
>
> `assets/js/lib/safeAsync.ts` is an explicit exception. As the top-level error boundary for fire-and-forget asynchronous tasks, it catches otherwise-unhandled Promise rejections and logs them with `console.error` to ensure failure visibility without terminating the runtime process.

```typescript
// Correct: the utility layer throws and doesn't log errors.
function validateSetting(value: unknown): number {
  if (typeof value !== "number") {
    throw new Error("Invalid setting value: expected number.", { cause: value });
  }
  return value;
}
```

### Application layer (`entrypoints/`)

- Responsible for catching exceptions thrown by utilities or external APIs, assessing the system-wide impact, and logging appropriately via `console.error` or other levels.

```typescript
// Correct: the application layer catches the error and logs it.
try {
  const value = validateSetting(rawValue);
} catch (error) {
  console.warn("Invalid setting value, falling back to default:", error);
}
```

---

## 3. Message format conventions

### Language and phrasing

- **Write in English.** Avoid abbreviations, slang, and informal contractions (for example, `can't`). Use standard phrasing such as `Failed to...` or `Unable to...`.
- **Provide context.** Do not write bare messages like `"Error"` or `"Invalid value"`. State what operation failed and what the specific problem is.

```typescript
// Good
console.error("Failed to read settings file:", error);

// Bad
console.error("Error, can't read Import File.");
```

### No level prefix in the message text

Do not prefix messages with `"Error, "`, `"Warning, "`, or `"Debug, "`.
The browser DevTools already labels and color-codes output by log level. Adding a text prefix is redundant and causes inconsistency when the log method is changed.

### No non-standard symbols

Do not use ad-hoc symbols such as `>>`, `>`, or `~` as separators or visual markers in message strings. Use standard English punctuation only.

```typescript
// Bad
console.warn("Invalid value >>", setting);
console.info("Blocked on site: " + blocked + "~" + window.location.href);
```

### Scope tag (optional)

> [!NOTE]
> This subsection is optional. In a single-extension or single-module environment where only one source emits console output, omit scope tags and begin with the message body directly. Adopt this format only when multiple extensions or modules output to the same console and the source must be identifiable.

When adopted, prefix the message with a tag in square brackets followed by a space. Keep the tag casing and separator style consistent across the project.

```typescript
// Correct (when adopted)
console.error("[Linkclump] Failed to read settings file:", error);

// Incorrect
console.error("Linkclump: Failed to read settings file:", error);  // no brackets, colon separator
console.error("[linkclump]Failed to read settings file:", error);  // inconsistent casing, no space after tag
```

---

## 4. Message termination rules

The trailing character of every log message string is determined by a single rule: **whether data follows as a second argument**.

### Rule A: A data argument follows, so end with a colon (`:`)

When passing a variable, error object, or detail data as a second argument, end the message string with a colon (`:`) to introduce the following argument.

```typescript
// Correct
console.error("Failed to read settings file:", error);
console.warn("Failed to load settings, falling back to default settings:", response);
console.info("Blocked on this site by matching pattern:", { pattern: blocked, url: window.location.href });
console.debug("Failed to send update message to tab:", { tab, error });

// Incorrect
console.error("Failed to read settings file.", error);  // period when data follows
console.warn("Invalid value >>", setting);              // non-standard symbol
```

### Rule B: No data argument follows, so end with a period (`.`)

When the message string alone fully describes the situation, end it with a period (`.`) as a complete sentence.

```typescript
// Correct
console.error("Selected action configuration was not found.");
console.error("Failed to initialize: received an empty response from background.");

// Incorrect
console.error("Selected action configuration was not found");   // missing period
console.error("Selected action configuration was not found:");  // colon with no second argument
```

---

## 5. Passing arguments (DevTools optimization)

Never concatenate object or error data into the message string with `+`. Always pass them as separate arguments after the message string.

```typescript
// Recommended: objects remain inspectable in DevTools.
console.warn("Failed to load settings, falling back to default settings:", response);
console.info("Blocked on this site by matching pattern:", { pattern: blocked, url: window.location.href });

// Not recommended: objects become strings and lose interactivity.
console.warn("Failed to load settings: " + JSON.stringify(response));
```

> [!WARNING]
> **Circular references and large objects**
>
> When integrating with external log collection services (such as Sentry), objects passed as arguments may be serialized via `JSON.stringify` or similar. Circular references or extremely large objects can cause serialization failures or data loss. In such cases, extract and pass only the necessary properties. (Verify whether any such integration exists in the current build configuration.)

---

## 6. Sensitive information

Error objects and response payloads passed as second arguments may inadvertently contain stack traces, tokens, cookies, or query parameters.

- Before passing an error object directly, review whether it contains credentials or raw user input.
- In production builds, consider whether `debug` / `info` level output could expose sensitive information to external parties.
- Consider applying build-time console removal settings (for example, a minifier's `drop_console` option) to suppress or strip `debug` / `info` level output from production builds. (Verify the current build configuration for existing settings.)

---

## 7. Quick reference

### Log level decision flow

```
Is there output to emit?
  │
  ├─ Is it a fatal failure that aborts the current process?
  │    └─ YES ──> console.error
  │
  ├─ Is it a warning, fallback, or bad value — but processing continues?
  │    (has visible impact on the user or affects future processing)
  │    └─ YES ──> console.warn
  │
  ├─ Is it a normal state change or feature control notification?
  │    └─ YES ──> console.info
  │
  ├─ Is it development/diagnostic detail, or a high-frequency expected trace?
  │    └─ YES ──> console.debug
  │
  └─ Do you need to identify the call site or call stack itself?
       └─ YES ──> console.trace
```

### Message termination decision flow

```
Determine the trailing character
  │
  └─ Is detail data (variable / object) passed as a second argument?
       ├─ YES ──> End with ":" and pass the data as the second argument
       └─ NO  ──> End with "." as a complete sentence
```

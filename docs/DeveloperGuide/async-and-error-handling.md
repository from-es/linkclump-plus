# Async and error handling

## Principles

1. **No floating Promises.** Every Promise must be awaited, returned, or passed to `safeAsync`. ESLint reports violations through `@typescript-eslint/no-floating-promises` (see [ESLint](./eslint.md)).
2. **Utilities throw; the application layer logs.** Modules under `assets/js/lib/` and `assets/js/constants/` throw an `Error` on failure. The code under `entrypoints/` catches it and decides the log level. See [Logging guidelines](./logging-guidelines.md#2-logging-responsibility-by-architectural-layer).
3. **Reply to every message that expects a reply.** See [Messaging](./messaging.md).

## `safeAsync`

[`safeAsync`](../../src/assets/js/lib/safeAsync.ts) runs a task in a fire-and-forget manner. It catches both synchronous exceptions and rejected Promises, and logs them with `console.error`:

```typescript
safeAsync(taskName, task, scope);
// Logged on failure: [scope] Error in taskName: <error>
```

| Argument | Description |
| :--- | :--- |
| `taskName` | A label for the log. Use the name of the function that you call. |
| `task` | A function that returns a value or a Promise. |
| `scope` | The log prefix. Use `"background"`, `"content"`, or `"options"`. |

### Layout of a call

```typescript
// A short task fits on one line.
safeAsync("openOptionsPage", () => browser.runtime.openOptionsPage(), "background");

// For a longer task, put each argument on its own line so that the scope stays visible.
safeAsync(
  "activate",
  () => browser.runtime.sendMessage({
    message: "activate",
    urls: open_tabs,
    setting: window.settings[window.setting]
  } as ActivateMessage),
  "content"
);

// For a complex task, move the callback into a variable.
const sendActivateMessage = () => browser.runtime.sendMessage({ /* ... */ });
safeAsync("activate", sendActivateMessage, "content");
```

### When not to use `safeAsync`

- When the caller needs the result or must react to the failure, use `await` with `try` and `catch`.
- Inside a handler that must always reply (such as `init`), catch the error yourself, reply, and then rethrow or log it. See `handleRequests.ts`.

```typescript
// Use await + try/catch when the caller needs the result or must reply.
try {
  const settings = await settingsManager.load();
} catch (error) {
  console.error("Failed to load settings:", error);
  sendResponse(undefined);
}
```

## Concurrency

The **Bookmarked** Action serializes the creation of its folders with the Web Locks API (`navigator.locks.request` with `BOOKMARK_CREATION_LOCK_NAME`), so that two Actions that run at the same time don't create the same parent folder twice. Use the same pattern for other "find or create" operations that two events can run concurrently.

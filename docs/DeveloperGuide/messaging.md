# Messaging

This document describes how the content script, the Options page, and the background process communicate. All messages use `browser.runtime.sendMessage` or `browser.tabs.sendMessage`. The types are in [`src/assets/js/types/Messages.ts`](../../src/assets/js/types/Messages.ts).

## Message types

### Messages that the background process receives

| `message` | Sender | Payload | Reply | Handler |
| :--- | :--- | :--- | :--- | :--- |
| `init` | Content script (when a page loads) | None | The settings (`InitResponse`, which is `Settings` with an optional `error`), or `undefined` on failure | `handleRequests` |
| `activate` | Content script (when the user releases the mouse button) | `urls` (an array of `{ url, title }`) and `setting` (the Action that matched) | None | `handleActivate` |
| `update` | Options page (when the user saves) | `settings` (the full `Settings`) | None | `handleUpdateSettings` |

### Messages that the content script receives

| `message` | Sender | Payload | Result |
| :--- | :--- | :--- | :--- |
| `update` | Background process (`ContentScriptManager.broadcastSettingsUpdate`) | `settings` | The content script applies the settings (Action list and blocklist) without a page reload. |
| `copyToClipboard` | Background process (`copyToClipboard`) | `text` | The content script of the frame that started the selection writes the text to the clipboard. The background process sends the message to the tab and the frame of the `activate` sender (`sender.tab.id` and `sender.frameId`). |

## Flow

```text
Page load
  content script ──init──▶ background ──(load from storage)──▶ settings
  content script ◀──────── reply (sendResponse) ───────────────┘
  content script: applySettings()

Selection finished
  content script ──activate(urls, setting)──▶ background
  background: handleActivate()
    → deduplicate (block) → reverse → copy / bm / win / tabs

Settings saved on the Options page
  options page ──update(settings)──▶ background
  background: validate (isSettings) → save → broadcast
  background ──update(settings)──▶ every http, https, and file tab
  content script: applySettings()
```

## Rules for message handlers

1. **Reply with `sendResponse` and return `true`.** While Firefox natively supports returning a Promise from message listeners and Chrome added support starting in version 148 (rolling out gradually; see [Chrome Extensions Message Passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)), this project targets Chrome 125+ and Firefox 152+. Using `sendResponse` and returning `true` for asynchronous responses is the universal pattern supported by both browsers and guarantees reliable operation regardless of browser version or Chrome's feature-rollout status. If a handler replies asynchronously, call `sendResponse` and return `true` from the listener to keep the message channel open. `handleRequests` returns `false` for messages that need no reply.
2. **Reply to every message that expects a reply, even on failure.** If a handler returns `true` and then never calls `sendResponse`, the sender waits forever. Messages that need no reply (`activate` and `update`) return `false`. In the `init` handler, `sendResponse(undefined)` is called in the `catch` block, and the content script logs an error when it receives an empty reply.
3. **Run fire-and-forget work through `safeAsync`.** See [Async and error handling](./async-and-error-handling.md).
4. **Validate data from other contexts.** The background process checks the settings of an `update` message with `isSettings` and rejects invalid data with a warning.
5. **Handle failed sends to tabs.** `tabs.sendMessage` fails for a tab that has no content script, such as a browser internal page. `broadcastSettingsUpdate` sends only to tabs whose URL starts with `http`, `https`, or `file`, and logs the remaining failures with `console.debug`.

## Adding a message type

1. Add the type to `src/assets/js/types/Messages.ts` and to the `Messages` union.
2. Add a `case` to `handleRequests` (background) or to the `onMessage` listener in `src/entrypoints/content/index.ts`.
3. Decide whether the sender needs a reply. If it does, follow rules 1 and 2.
4. Update the table in this document.

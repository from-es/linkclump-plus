# Browser differences

This document lists the differences between Chrome and Firefox that affect the code. For the build mechanism, see [Architecture overview](./architecture.md#4-cross-browser-build).

| Area | Chrome | Firefox | Where it matters |
| :--- | :--- | :--- | :--- |
| Background process | Service worker (`background.service_worker`) | Non-persistent event page (`background.scripts` in the generated manifest) | Timers in the background process don't survive an idle stop. See the note below. |
| Promise from `onMessage` listener | Supported from Chrome 148 (rolling out gradually; see [Chrome Message Passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging)) | Supported natively | Universal approach: reply with `sendResponse` and `return true`. See [Messaging](./messaging.md). |
| Bookmark root folders | Bookmarks bar (ID `1`) and Other bookmarks (ID `2`) | Bookmarks Menu (GUID `menu________`) and Other Bookmarks (GUID `unfiled_____`) | `resolveBookmarkFolderId` in `actions/bookmark.ts`. The **Main** option of the **Bookmarked** Action maps to the first folder of each pair. |
| Command (⌘) key code | `91` (left) and `93` (right) | `91` and `93`, and `224` on macOS | `KEY_CODE_META`, `KEY_CODE_META_RIGHT`, and `KEY_CODE_META_FIREFOX_MAC` in `constants/keyboard.ts` |
| Manifest fields | `minimum_chrome_version` | `browser_specific_settings.gecko` (extension ID, minimum version, `data_collection_permissions`) | `getManifest` in `wxt.config.ts` removes the field of the other browser. |
| Minimum version | 125 | 152 | `src/manifest.ts` |
| Browser detection | `detectBrowser()` checks `browser_specific_settings` in the manifest first, then User-Agent Client Hints, and then `navigator.userAgent` | | `src/assets/js/lib/detectBrowser.ts` |

## Background process lifecycle

Both browsers can stop the background process while it is idle, and they start it again for the next event. Keep these rules in mind:

- Don't keep state in module-level variables across events. Store it with `storage` or recreate it.
- A `setTimeout` that is pending when the process stops never runs. The delay between opening tabs (`delay`) and the auto-close timer (`close`) in `utils/openTab.ts` have this limitation. The user-facing description is in [Notices](../UserGuide/Notices.md#background-process-lifecycle-delay-and-auto-close).
- Register event listeners synchronously when the background script loads (see `main` in `background/index.ts`) so that the browser can wake the process for them.

## OS-dependent behavior

The OS, not the browser, decides when the `contextmenu` event fires (on `mouseup` in Windows, on `mousedown` in macOS and Linux). The content script handles this in `pointer/pointerEvents.ts`. The key list of the Options page also depends on the OS (`displayKeys` in `options.ts`). See [Notices](../UserGuide/Notices.md#key-availability-by-os).

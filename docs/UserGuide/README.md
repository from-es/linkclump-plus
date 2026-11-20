# Linkclump Plus: User guide

## Documentation index

- [User guide](./README.md): this document.
- [FAQ](./FAQ.md): answers to common setup and usage questions.
- [Notices](./Notices.md): OS- and browser-specific details, known limitations, and known issues.

## Overview

**Linkclump Plus** is a browser extension that lets you select multiple links at once by dragging a box around them. With a single mouse action, you can:

- Open the links in **new tabs**.
- Open the links in a **new window**.
- **Bookmark** the links in a timestamped folder.
- **Copy** the URLs and titles to the clipboard in several formats, such as plain text, HTML, and Markdown.

> [!NOTE]
> This document targets the **latest version** of the extension. Depending on your extension's version, some features or screen displays may differ from what is described here.

## Supported browsers

| Browser | Minimum version |
| :--- | :--- |
| Google Chrome and Chromium-based browsers | 125 |
| Mozilla Firefox and Firefox-based browsers | 152 |

Older versions of these browsers aren't supported.

## Basic usage

1. **Start the selection.**
   Hold the configured key (for example, `Z` or `Shift`) and drag the configured mouse button (for example, left or right) across the links you want to select.
2. **Check the selection.**
   A colored selection box appears. As the box overlaps links, a counter badge shows the number of unique links that are selected.
3. **Run the Action.**
   Release the mouse button. The selected links are passed to the configured Action (open tabs, copy, bookmark, and so on).

While you drag, you can also do the following:

- **Scroll the page:** Move the pointer to within about 20 px of the top or bottom edge of the window. The page scrolls vertically, and the closer the pointer is to the edge, the faster it scrolls.
- **Cancel the selection:** If the Action uses a key, release the key before you release the mouse button. Linkclump Plus then ends the selection without running the Action. The selection also ends without running the Action when the window loses focus.

When you install Linkclump Plus for the first time, the Options page opens in a new window and shows a short tour.

### Select links inside frames

> [!NOTE]
> **Selection is limited to one frame.** The selection box and the links it selects belong to the frame where you **start** the drag. A frame is either the page itself or an embedded `<iframe>`.
>
> - To select links inside an `<iframe>`, start the drag **inside** that frame.
> - Links in other frames are not selected, and the box is never drawn outside the frame where the drag started.
>
> This applies to both same-domain and cross-domain frames. For details, see [Selection is limited to one frame](./Notices.md#selection-is-limited-to-one-frame).

### Touch input

On a touch screen, **press and hold for about 0.5 seconds**, and then drag. When the hold is recognized, supported devices vibrate briefly (30 ms).

Touch input can't hold a key, so Linkclump Plus ignores the key setting and runs the Action that is set to the **Left** mouse button. If more than one Action uses the Left button, the Action with the key `None` is used; otherwise, the first Left-button Action in the list is used. If you move your finger more than about 8 px before the hold is recognized, the page scrolls as usual. If no Action uses the Left button, a long press doesn't start a selection. For details, see [Touch input](./Notices.md#touch-input).

## Actions and options

Linkclump Plus lets you configure multiple, independent **Actions**. Each Action defines what happens when you drag-select links with a specific mouse button and key.

### Default settings

A new installation has one Action:

| Setting | Value |
| :--- | :--- |
| Trigger | Left mouse button + `Z` key |
| Action type | **Opened as New Tabs** |
| **selection box color** | `#FFA500` (orange) |
| **smart select** | on |
| **filter links** | exclude links with words (no words set) |
| **delay in opening** | `0` |
| **close tab time** | `0` (tabs stay open) |
| **block repeat links in selection** | on |
| **reverse order** | off |
| **open tabs at the end** | off |
| **counter font size** | `16` |
| **counter font weight** | `400` |
| **bgcolor of the counter the same as the box** | on |
| Blocklist | empty |

### 1. Action types

| Action type | Name on the Options page | Description |
| :--- | :--- | :--- |
| `tabs` | Opened as New Tabs | Opens the selected links as new tabs in the current window. |
| `win` | Opened in a New Window | Opens the selected links in a new browser window. |
| `bm` | Bookmarked | Saves the selected links in a timestamped bookmark folder. |
| `copy` | Copied to clipboard | Copies the URLs, the titles, or both to the clipboard. |

### 2. Triggers

Each Action is started by a unique combination of a **mouse button** and a **key**.

- **Mouse button:** `Left`, `Middle` (wheel click), or `Right`.
- **Key:**
  - `None` (no key held). See the warnings that follow.
  - Modifier keys: `Shift`, `Ctrl`, `Alt` (Windows and macOS only), and `Cmd` (⌘, macOS only).
  - Letter keys: `A` to `Z`. The Options page lists them in lowercase. The default is `Z`.

> [!IMPORTANT]
> - **Right-click without a key** isn't available on macOS and Linux. On these systems, the browser opens the native right-click menu when you press the button, before Linkclump Plus can tell whether you are dragging. Without a key, Linkclump Plus would have to block the menu on every right-click, so the Options page doesn't offer this combination. See [Right-click `contextmenu` timing by OS](./Notices.md#right-click-contextmenu-timing-by-os).
> - **Laptop trackpads:** On Windows and Linux laptops, the OS can ignore the built-in trackpad while you press a letter key (such as `Z`), so the selection doesn't start. Use `Ctrl`, `Shift`, or `Alt` instead. On macOS, this problem isn't expected, but it hasn't been verified on real devices yet. For details and other solutions, see [Laptop trackpad (palm rejection)](./Notices.md#laptop-trackpad-palm-rejection).
> - **Duplicate triggers:** Don't register the same mouse button and key for more than one Action. Linkclump Plus checks the Actions in the order they are listed on the Options page, from top to bottom, and runs only the first match. The other Actions never run.

### 3. Action-specific options

#### A. Opened as New Tabs (`tabs`)

- **delay in opening:** The delay, in seconds, between opening each tab. When the delay is greater than `0`, the new tabs are not linked to the tab you started from, so the remaining links keep opening even if you close that tab. Use a delay to avoid freezing the browser when you open many heavy pages.
- **close tab time:** The number of seconds before an opened tab is closed automatically. `0` keeps the tab open. The timer starts when the tab is created, not when the page finishes loading. Long timers might not run. See [Background process lifecycle](./Notices.md#background-process-lifecycle-delay-and-auto-close).
- **open tabs at the end:** Places new tabs at the far right of the tab bar instead of next to the current tab.

#### B. Opened in a New Window (`win`)

- **delay in opening:** The delay, in seconds, between opening each link in the new window.
- **do not focus on new window:** Keeps the focus on the current window instead of moving it to the new window.

#### C. Bookmarked (`bm`)

- **select bookmarks:** Selects where Linkclump Plus creates its folder.

| Setting | Chrome | Firefox |
| :--- | :--- | :--- |
| `Main` (default) | Bookmarks bar | Bookmarks Menu |
| `Other bookmarks` | Other bookmarks | Other Bookmarks |

Each save creates a folder with the following structure:

```text
<selected location>/Linkclump Plus/YYYY-MM-DD HH:mm:ss/<saved links>
```

- The `Linkclump Plus` folder is created on the first save and reused afterward. If the browser doesn't provide the extension name, the folder is named `Collected Links`.
- Each save goes into its own folder named with the current date and time. The newest folder is placed at the top. Saves within the same second share one folder.
- Folders that earlier versions created directly in the selected location (`Linkclump <date>`) are not moved.

For what happens when saving fails, see [Bookmarked Action](./Notices.md#bookmarked-action).

#### D. Copied to Clipboard (`copy`)

- **copy format:** Selects the text layout that is written to the clipboard.

| Format | Result |
| :--- | :--- |
| `URLS with titles` | The title and the URL, separated by a tab, one link per line. |
| `URLS only` | One URL per line. |
| `URLS only space separated` | All URLs on a single line. Each URL is followed by one space, including the last one. |
| `titles only` | One title per line. |
| `as link HTML` | One HTML anchor tag per line: `<a href="...">...</a>`. |
| `as list link HTML` | An HTML unordered list: `<ul>`, then one `<li><a href="...">...</a></li>` per line, then `</ul>`. |
| `as Markdown` | One Markdown link per line: `[Title](URL)`. |

> [!NOTE]
> Each title is cleaned up before it is copied: runs of whitespace and line breaks become a single space, and leading and trailing spaces are removed. The HTML and Markdown formats also escape special characters so that the result stays valid:
>
> - **HTML:** `&`, `<`, `>`, and `"` in titles and URLs become HTML entities (`&amp;`, `&lt;`, `&gt;`, and `&quot;`).
> - **Markdown:** `[`, `]`, and `\` in titles get a backslash. Parentheses, angle brackets, and whitespace in URLs are percent-encoded.

### 4. Common options

These options are available for every Action type.

- **What counts as a link:** Linkclump Plus selects `<a>` and `<area>` (image map) elements that have an `href`.
- **selection box color:** Click the color swatch to choose a box color for the Action.
- **smart select:**
  - `on`: If the box contains at least one link that is placed directly inside a heading (`<h1>` to `<h6>`), **only** such heading links are selected. If the box contains no heading link, all links in the box are selected.
  - `off`: All links that touch the box are selected.
  - With either setting, links are never selected in these cases: the `href` starts with `javascript:`, the `href` is empty or `#`, or the link is hidden (`display: none` or `visibility: hidden`).
- **filter links:** Enter words separated by commas (,). Matching is case-insensitive. When you save, Linkclump Plus converts the words to lowercase. Do not add a space before a comma: spaces before a comma become part of the preceding word, so `word1 , word2` creates the words `word1 ` (with a trailing space) and `word2`. Spaces after a comma are stripped automatically. A word cannot contain a comma. A word matches if it appears in the link's URL or in the HTML source inside the link's `<a>` element. The HTML source includes tag names and attribute values, such as `img` or a class name, not only the visible text.
  - `exclude links with words`: Excludes links that match any of the words.
  - `include links with words`: Selects only links that match at least one of the words.

  > [!NOTE]
  > Linkclump Plus joins the words into one regular expression. Characters such as `.`, `?`, `+`, `*`, `(`, and `[` have their regular expression meanings. The Options page checks the words when you save and doesn't save an invalid expression. If an invalid expression comes from older settings, Linkclump Plus selects no links instead of failing.
- **block repeat links in selection:** Opens, copies, or bookmarks each URL only once, even if the selection contains the same link more than once. The counter badge always shows the number of unique URLs, regardless of this setting.
- **reverse order:** Processes the links in reverse order. The order is the order in which the links appear in the page source, not their position on the screen.
- **counter font size:** The font size of the counter badge, from `8` to `64` px. The default is `16`.
- **counter font weight:** The weight of the counter text, from `1` to `1000`. The default is `400`.
- **bgcolor of the counter the same as the box:** Uses the selection box color as the background color of the counter badge.

### 5. Blocked sites (blocklist)

At the bottom of the Options page, you can list pages and domains where Linkclump Plus is turned off. Use the blocklist to keep native drag behavior in web apps such as online spreadsheets, interactive maps, and drawing tools.

#### How matching works

Enter one entry per line. Linkclump Plus checks whether each entry matches **anywhere in the page's full URL** (`window.location.href`, including the protocol, path, and query parameters).

Because matching looks anywhere in the URL, a simple text entry works as a **partial (substring) match**.

> [!TIP]
> **Avoid unintended matches by including `http://` or `https://`**
>
> If you enter only a bare domain such as `example.com`, it will also match unintended pages whose address happens to contain that text, for example:
> - Other domains: `https://notexample.com/`
> - Referral or redirect parameters on other sites: `https://other.net/?ref=example.com`
>
> To avoid matching other domains, **start your entry with `http://` or `https://` and include a trailing slash**, such as `https://example.com/`. This simple change prevents matching sites like `notexample.com` without needing regular expressions. For even stricter matching (such as blocking only the top page), see [Regular expressions (for advanced users)](#regular-expressions-for-advanced-users) below.

#### Common patterns

| Goal | Entry | Explanation |
| :--- | :--- | :--- |
| Block a specific site | `https://example.com/` | **Recommended.** Matches URLs starting with or containing this text, avoiding unintended matches on similar domains like `notexample.com`. Note that `www.example.com` or `http://` require their own lines if used. |
| Block a domain and its subdomains | `example.com` | Matches `https://example.com/` and `https://sub.example.com/`. Note that it also matches other domains that contain this text. |
| Block only one subdomain | `https://mail.google.com/` | Blocks `mail.google.com` but not `google.com` or `drive.google.com`. |
| Keep the top page active, but block a path | `https://example.com/editor/` | `https://example.com/` keeps working. Pages under `/editor/` are blocked. |

> [!NOTE]
> Plain text entries are sufficient for most users. The section below covers regular expression syntax for advanced matching cases.

#### Regular expressions (for advanced users)

Each entry is evaluated as a case-insensitive regular expression. While plain text entries work for most users, you can use regular expression syntax for advanced matching:

- **Wildcards:** A bare `*` is not a wildcard. In a regular expression, `*` repeats the preceding character, so `*.example.com` is a syntax error and cannot be saved. To match any sequence of characters, use `.*`, for example `.*\.example\.com`. In most cases, a plain entry like `https://example.com/` is simpler and safer.
- **Special characters:** `.`, `?`, `+`, `*`, `(`, and `)` have special meanings. To match one literally, put a backslash before it, for example `example\.com/search\?q=`.
- <a id="match-only-the-top-page"></a>**Match only the top page:** Use anchors (`^` for the start, `$` for the end) to block only the top page of a site: `^https?://(www\.)?example\.com/?$`. This entry matches `https://example.com/` and `https://www.example.com/`. It doesn't match other subdomains, other paths, a port number, or a query string.
- **Validation:** The Options page checks every line before it saves. If a line isn't a valid regular expression, the page doesn't save and shows an error message. If an invalid entry comes from older settings, Linkclump Plus ignores that entry and keeps working on other sites.
- **Frames:** In a page with `<iframe>` elements, Linkclump Plus checks each frame's own URL separately.
- **Immediate effect:** Saved changes apply to all open tabs without reloading them.

## Manage settings

### Import and export

You can back up your settings or move them to another browser profile or computer:

- **Export:** Downloads your current settings as a `.json` file.
- **Import:** Restores settings from an exported `.json` file. If the file isn't a valid settings file, Linkclump Plus rejects it and keeps your current settings. No message appears on the screen; the error appears only in the browser console.

> [!NOTE]
> The Options page marks Import / Export as a feature that is still under testing.

### Sync

Linkclump Plus stores your settings in your browser's extension sync storage. If you are signed in to your browser account and sync is turned on, the settings are synced to your other devices. The browser limits the size of the stored data. For details, see [Settings sync storage quota](./Notices.md#settings-sync-storage-quota).

## Required permissions

Linkclump Plus requests only the permissions it needs:

| Permission | Purpose |
| :--- | :--- |
| `tabs` | Open, position, and close tabs, and send messages (such as settings updates and copy requests) to your open tabs. |
| `bookmarks` | Create folders and save links for the **Bookmarked** Action. |
| `storage` | Save and sync your settings and Actions. |
| `clipboardWrite` | Write links and titles to the clipboard for the **Copied to clipboard** Action. |
| `scripting` | Add Linkclump Plus to tabs that were already open when you first installed the extension. |
| `host_permissions` (`*://*/*`) | Show the selection box and detect links on `http` and `https` pages. To use Linkclump Plus on local `file://` pages, you must also turn on access to file URLs in your browser. See the [FAQ](./FAQ.md#q-it-doesnt-work-on-local-files-file-urls). |

Linkclump Plus doesn't track your browsing activity, collect telemetry, or send data to external servers.

## Support

Linkclump Plus is a free extension, and the developer can't provide individual support.

To report a problem or request a feature, open an issue on [GitHub Issues](https://github.com/from-es/linkclump-plus/issues).

## Links

- **Repository:** [from-es/linkclump-plus - GitHub](https://github.com/from-es/linkclump-plus)
- **Official Extension Store:**
  - [Chrome Web Store](https://chromewebstore.google.com/detail/linkclump-plus/ainlglbojoodfdbndbfofojhmjbmelmm)
  - [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/linkclump-plus/)

## License

Linkclump Plus is released under the [MIT License](../../LICENSE.md).

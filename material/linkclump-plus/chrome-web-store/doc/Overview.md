## About

Linkclump Plus lets you select multiple links at once by dragging a selection box over them. Hold a key, drag the mouse across the links you want, and release — all selected links are processed in one action.

- Open as new tabs — links open side-by-side in the current window.
- Open in a new window — links open together in a separate window.
- Save as bookmarks — links are saved in a timestamped folder inside a "Linkclump Plus" parent folder.
- Copy to clipboard — URLs, titles, or both are copied in your choice of format: plain text, HTML, Markdown, and more.

You can configure multiple independent actions, each with its own trigger (mouse button and key) and settings.

## Features

### Selection

- Drag a selection box over links. A counter badge shows how many unique links are inside the box as you drag.
- Smart select — when the box contains links inside headings, only those heading links are selected. Turn this off to select all links in the box.
- Auto-scroll — the page scrolls automatically when you drag near the top or bottom edge of the window.
- Filter links — include or exclude links whose URL or text matches a list of words.
- Block repeat links — open, copy, or save each URL only once, even if the same link appears more than once in the selection.
- Reverse order — process links in reverse page-source order.

### Copy formats

The "Copy to clipboard" action supports seven formats:

- URLs with titles (title and URL separated by a tab, one link per line)
- URLs only (one per line)
- URLs only, space-separated (all on one line)
- Titles only
- HTML anchor tags (<a href="...">...</a>, one per line)
- HTML unordered list (<ul> with <li><a> entries)
- Markdown links ([Title](URL), one per line)

### Triggers

Each action is started by a unique combination of a mouse button (left, middle, or right) and a key (Shift, Ctrl, Alt, Cmd on macOS, or any letter A–Z). The Options page lists only the combinations that are valid for your operating system.

Touch screens are supported: press and hold for about 0.5 seconds, then drag.

Note for laptop users: on Windows and Linux, using a modifier key (Ctrl, Shift, or Alt) is recommended when using a built-in trackpad.

### Blocklist

Add URLs or domains to the blocklist to disable Linkclump Plus on specific pages, such as online spreadsheets, interactive maps, or drawing tools. Saved changes apply to all open tabs immediately, without reloading.

### Customization

- Selection box color — set a different color for each action.
- Counter badge — adjust font size and weight.
- Delay between tabs — add a pause between opening each tab to avoid overloading the browser.
- Auto-close — close newly opened tabs automatically after a set number of seconds.

### Settings

- Settings are stored in browser extension sync storage and sync across your signed-in devices.
- Export settings as a JSON file and import them on another device or browser profile.

## System Requirements

Works with Google Chrome and Chromium-based browsers (version 125 or later).

## Documentation

- User guide — Basic usage, Actions, options, and permissions:
	- https://github.com/from-es/linkclump-plus/blob/main/docs/UserGuide/README.md
- FAQ — Answers to common setup and usage questions:
	- https://github.com/from-es/linkclump-plus/blob/main/docs/UserGuide/FAQ.md
- Notices — OS- and browser-specific details, as well as known limitations and issues:
	- https://github.com/from-es/linkclump-plus/blob/main/docs/UserGuide/Notices.md
- Developer guide — Architecture, build setup, testing, and contribution guidelines:
	- https://github.com/from-es/linkclump-plus/blob/main/docs/DeveloperGuide/README.md

## FAQ & Known Issues

For a full list of known issues, workarounds, and OS- or browser-specific limitations, see Notices and FAQ above.

### Opened links not marked as "Visited" (link color does not change)

Starting with Chrome 136 (April 2025), links opened by extensions may not be marked as visited on other pages (their color does not change to the site's visited style). This is caused by Chrome's "Partitioned :visited links history" feature, not a bug in Linkclump Plus. For background, workarounds, and security considerations, see:
https://github.com/from-es/linkclump-plus/blob/main/docs/UserGuide/Notices.md#opened-links-not-marked-as-visited-chrome--edge

## Support

Linkclump Plus is a free extension, and the developer cannot offer individual support. To report a problem or request a feature, open an issue on GitHub (https://github.com/from-es/linkclump-plus/issues).

## Related Links

- Linkclump (Original):
	- Repository: https://github.com/benblack86/linkclump
- linkclump-ng (Manifest V3 port):
	- Repository: https://github.com/wvanderp/linkclump
- Linkclump Plus (This fork):
	- Repository: https://github.com/from-es/linkclump-plus
	- Official Extension Store:
		- Chrome Web Store: https://chromewebstore.google.com/detail/ainlglbojoodfdbndbfofojhmjbmelmm
		- Firefox Add-ons: https://addons.mozilla.org/firefox/addon/linkclump-plus/

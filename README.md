# Linkclump Plus

<!-- badge -->
[![Ask DeepWiki](./material/deepwiki/badge.svg)](https://deepwiki.com/from-es/linkclump-plus)

## About

The original [Linkclump](https://chromewebstore.google.com/detail/linkclump/lfpjkncokllnfokkgpkobnkbkmelfefj "https://chromewebstore.google.com/detail/linkclump/lfpjkncokllnfokkgpkobnkbkmelfefj") extension is built on Manifest V2. Following Google's removal of Manifest V2 extensions from the Chrome Web Store, it is no longer available for installation.

[Linkclump Plus](https://chromewebstore.google.com/detail/ainlglbojoodfdbndbfofojhmjbmelmm "https://chromewebstore.google.com/detail/ainlglbojoodfdbndbfofojhmjbmelmm") is a fork of [linkclump-ng](https://github.com/wvanderp/linkclump "https://github.com/wvanderp/linkclump") with bug fixes and additional features, built on Manifest V3. It supports Google Chrome and Chromium-based browsers, as well as Mozilla Firefox and Firefox-based browsers.

Thanks to [benblack86](https://github.com/benblack86 "https://github.com/benblack86") for creating the original extension and [wvanderp](https://github.com/wvanderp "https://github.com/wvanderp") for updating it to Manifest V3.

## Documentation

- **[User guide](./docs/UserGuide/README.md):** Basic usage, Actions, options, and permissions.
- **[FAQ](./docs/UserGuide/FAQ.md):** Answers to common setup and usage questions.
- **[Notices](./docs/UserGuide/Notices.md):** OS- and browser-specific details, as well as known limitations and issues.
- **[Developer guide](./docs/DeveloperGuide/README.md):** Architecture, build setup, testing, and contribution guidelines.

## Installation

Install from your browser's official extension store:

- [Linkclump Plus - Chrome Web Store](https://chromewebstore.google.com/detail/ainlglbojoodfdbndbfofojhmjbmelmm "Linkclump Plus - Chrome Web Store")
- [Linkclump Plus - Firefox Add-ons](https://addons.mozilla.org/firefox/addon/linkclump-plus/ "Linkclump Plus - Firefox Add-ons")

## Build

Before you start, confirm that [Node.js](https://nodejs.org/ "https://nodejs.org/") is installed.

```bash
node --version
```

A version number starting with `v` appears if Node.js is available.

1. Clone the repository and navigate to the project root.

   ```bash
   git clone https://github.com/from-es/linkclump-plus.git
   cd linkclump-plus
   ```

   > [!NOTE]
   > If you cloned via a Git GUI tool (such as SourceTree) or downloaded a ZIP archive, make sure your terminal's current directory is the project root (where `package.json` is located) before running subsequent commands.

2. Install dependencies.

   ```bash
   npm ci
   ```

3. Build the extension.

  - Chrome:
    ```bash
    npm run build:chrome:prod
    ```
  - Firefox:
    ```bash
    npm run build:firefox:prod
    ```

The built files go to `.output/chrome-mv3/` or `.output/firefox-mv3/`.

For all available commands (development mode, source maps, ZIP packages, type checking, and linting) and browser-loading instructions, see the [Developer guide](./docs/DeveloperGuide/README.md).

## Permissions

This extension requires the following browser permissions to function:

| Permission | Purpose |
|---|---|
| `tabs` | Open selected links in new tabs or a new window. |
| `bookmarks` | Save selected links as bookmarks. |
| `storage` | Save and load your settings. |
| `clipboardWrite` | Copy selected links to the clipboard. |
| `scripting` | Bring already-open tabs up to date with the content script immediately after first installation, without requiring a manual page reload. |
| Host permission (`*://*/*`) | Inject the content script into web pages so links can be detected and selected on any site. |

## Support

Linkclump Plus is a free extension, and the developer cannot offer individual support.

If you have any issues or feature requests, please report them on [GitHub Issues](https://github.com/from-es/linkclump-plus/issues "https://github.com/from-es/linkclump-plus/issues").

## FAQ & Known Issues

For a full list of known issues, workarounds, and OS- and browser-specific limitations, see [Notices](./docs/UserGuide/Notices.md) and [FAQ](./docs/UserGuide/FAQ.md).

## Related Links

- **Linkclump** (Original):
  - Repository: [benblack86/linkclump - GitHub](https://github.com/benblack86/linkclump "https://github.com/benblack86/linkclump")
  - Official Extension Store: [Linkclump - Chrome Web Store](https://chromewebstore.google.com/detail/linkclump/lfpjkncokllnfokkgpkobnkbkmelfefj "https://chromewebstore.google.com/detail/linkclump/lfpjkncokllnfokkgpkobnkbkmelfefj") (Manifest V2; removed from the Chrome Web Store)
- **linkclump-ng** (Manifest V3 port):
  - Repository: [wvanderp/linkclump - GitHub](https://github.com/wvanderp/linkclump "https://github.com/wvanderp/linkclump")
- **Linkclump Plus** (This fork):
  - Repository: [from-es/linkclump-plus - GitHub](https://github.com/from-es/linkclump-plus "https://github.com/from-es/linkclump-plus")
  - Official Extension Store:
    - [Linkclump Plus - Chrome Web Store](https://chromewebstore.google.com/detail/ainlglbojoodfdbndbfofojhmjbmelmm "Linkclump Plus - Chrome Web Store")
    - [Linkclump Plus - Firefox Add-ons](https://addons.mozilla.org/firefox/addon/linkclump-plus/ "Linkclump Plus - Firefox Add-ons")

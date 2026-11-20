# Architecture overview

## 1. Tech stack

### Runtime and build tools

| Tool | Version | Role |
| :--- | :--- | :--- |
| [Node.js](https://nodejs.org/) | v22.22.1 or later (recommended) | JavaScript runtime and package manager |
| [WXT](https://wxt.dev/) | `^0.21.4` | Browser extension build framework |

### Languages

| Language | Usage |
| :--- | :--- |
| TypeScript | Application code under `src/` |
| JavaScript | WXT and ESLint config files (`*.config.*`), the third-party color picker (`src/assets/js/lib/colorpicker/`), and the legacy tests (`tests/code/`) |
| HTML and CSS | Options page and playground |

### Dependencies

| Package | Type | Purpose |
| :--- | :--- | :--- |
| [jquery](https://jquery.com/) `^4.0.0` | dependencies | DOM manipulation and UI events on the Options page |
| [dayjs](https://day.js.org/) `^1.11.23` | dependencies | Date and time formatting |
| [wxt](https://wxt.dev/) `^0.21.4` | devDependencies | Build framework |
| [typescript](https://www.typescriptlang.org/) `^6.0.3` | devDependencies | Type checking |
| [typescript-eslint](https://typescript-eslint.io/) `^8.71.1` | devDependencies | TypeScript ESLint integration |
| [@stylistic/eslint-plugin](https://eslint.style/) `^5.10.0` | devDependencies | Code style lint rules |
| [eslint](https://eslint.org/) `^10.12.0` | devDependencies | Static analysis tool |
| [@eslint/js](https://www.npmjs.com/package/@eslint/js) `^10.0.1` | devDependencies | ESLint recommended core rules |
| [globals](https://www.npmjs.com/package/globals) `^17.13.0` | devDependencies | Global variable definitions for ESLint |
| [@types/jquery](https://www.npmjs.com/package/@types/jquery) `^4.0.1` | devDependencies | TypeScript type definitions for jQuery |
| [vitest](https://vitest.dev/) `^5.0.5` | devDependencies | Test runner |
| [@vitest/coverage-v8](https://www.npmjs.com/package/@vitest/coverage-v8) `^5.0.5` | devDependencies | Coverage report for Vitest |
| [@vitest/ui](https://www.npmjs.com/package/@vitest/ui) `^5.0.5` | devDependencies | Browser UI for Vitest |
| [jsdom](https://github.com/jsdom/jsdom) `^30.1.3` | devDependencies | Simulated browser DOM for the tests |

### Target browsers

| Browser | Minimum version | Manifest field |
| :--- | :--- | :--- |
| Google Chrome and Chromium-based browsers | 125 | `minimum_chrome_version` |
| Mozilla Firefox and Firefox-based browsers | 152 | `browser_specific_settings.gecko.strict_min_version` |

The minimum versions come from the web platform features that the code uses. The comment above `minimum_chrome_version` in [`src/manifest.ts`](../../src/manifest.ts) lists each feature and its minimum version in Chrome and Firefox. When you use a new web platform feature, update that comment and the minimum versions in the same change. Update the **Supported browsers** table in the [User guide](../UserGuide/README.md#supported-browsers) as well.

| Feature | Chrome | Firefox |
| :--- | :--- | :--- |
| CSS `:has()` | 105 | 121 |
| CSS nesting | 120 | 117 |
| CSS `field-sizing` | 123 | 152 |
| Popover API | 114 | 125 |
| `URL.canParse()` | 120 | 115 |
| `Error` `cause` option | 125 | 91 |
| `ClipboardItem` | 76 | 127 |
| `data_collection_permissions` (Firefox Add-ons) | Not applicable | 140 (desktop), 142 (Android) |

> [!NOTE]
> The Chrome version of `Error` `cause` in the table is the value written in `src/manifest.ts`. If you change the minimum version, verify each value against [MDN Browser Compatibility Data](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error/cause) first.

The extension uses Manifest V3. WXT generates the `manifest.json` for each browser at build time. For the differences between the browsers, see [Browser differences](./browser-differences.md).

---

## 2. Directory structure

```text
linkclump-plus/                # Repository root (location of package.json)
│
├── src/                       # Source code
│   ├── manifest.ts            # Manifest V3 definition
│   │
│   ├── assets/js/             # Modules shared across multiple entrypoints
│   │   ├── constants/         # Constants (actions, keys, mouse buttons, timing, settings)
│   │   ├── lib/               # Shared utilities (browser/OS detection, safeAsync, settings guard)
│   │   │   └── colorpicker/   # Third-party color picker (excluded from ESLint)
│   │   └── types/             # Shared type definitions (Settings, Messages, Options)
│   │
│   ├── entrypoints/           # WXT entrypoints (each build artifact root)
│   │   ├── background/        # Background process (service worker / event page)
│   │   │   ├── index.ts       # Composition root
│   │   │   ├── deps.ts        # Dependency injection container types
│   │   │   ├── actions/       # Action execution (open tabs/windows, copy, bookmark)
│   │   │   ├── init/          # First-install initialization
│   │   │   ├── messaging/     # Message dispatchers (activate, init, update)
│   │   │   ├── scripts/       # Content script injection and settings broadcast
│   │   │   ├── settings/      # Settings and storage managers
│   │   │   └── utils/         # Background utilities (tab opening, URL deduplication)
│   │   │
│   │   ├── content/           # Content script (injected into all frames)
│   │   │   ├── dom/           # Selection box and counter label
│   │   │   ├── keyboard/      # Keyboard state tracking
│   │   │   ├── matching/      # Action trigger matching
│   │   │   ├── pointer/       # Pointer and context menu event handling
│   │   │   ├── selection/     # Selection lifecycle (start, update, stop)
│   │   │   ├── settings/      # Settings and blocklist application
│   │   │   ├── touch/         # Touch long-press detection
│   │   │   ├── types/         # Content script state types
│   │   │   └── utils/         # Event utilities
│   │   │
│   │   └── options/           # Options page
│   │       ├── index.html     # Page HTML
│   │       ├── options.ts     # UI logic (jQuery)
│   │       └── style.css      # Stylesheet
│   │
│   └── public/                # Static assets copied directly to build output
│       ├── img/               # Extension icons and Options page graphics
│       └── playground/        # Test page for manual verification
│
├── tests/                     # Test assets (see tests/README.md)
│   ├── assets/                # Tests for src/assets/js/
│   ├── entrypoints/           # Tests for background, content, and options
│   ├── shared/                # Shared test infrastructure (TestRunner, mocks, fixtures)
│   ├── _vitest-check/         # Test environment smoke tests
│   └── page/                  # Manual functional test pages
│
├── docs/                      # User Guide and Developer Guide
├── material/                  # Store listings, icons, and review documentation
├── .github/                   # Issue templates and CI workflows
├── .wxt/                      # WXT-generated files (ignored by Git)
│   └── tsconfig.json          # Base path aliases config
├── .output/                   # Build output directories (ignored by Git)
│
├── wxt.config.ts              # WXT build configuration and browser manifests
├── tsconfig.json              # Root TypeScript configuration
├── eslint.config.js           # ESLint flat configuration
└── package.json               # npm scripts, dependencies, and metadata
```

### Key directories and components

- **`src/`**: The core extension source code.
  - **`manifest.ts`**: The Manifest V3 definition (version, permissions, minimum browser versions).
  - **`assets/js/`**: Modules shared by multiple entrypoints (`constants/`, `lib/`, `types/`).
  - **`entrypoints/`**: The root of each build artifact managed by WXT.
    - **`background/`**: Background process (service worker in Chrome, event page in Firefox) managing tabs, windows, bookmarks, and settings state.
    - **`content/`**: Content script injected into every frame of web pages to handle mouse/touch drag selection and link collection.
    - **`options/`**: Options page UI (`index.html`, `options.ts`, `style.css`).
  - **`public/`**: Static files copied directly into build output (`img/` for icons and graphics, `playground/` for functional testing).
- **`tests/`**: Automated unit and integration tests (Vitest) and manual test pages. See [tests/README.md](../../tests/README.md) and [testing.md](./testing.md).
- **`docs/`**: Official documentation, divided into `UserGuide/` and `DeveloperGuide/`.
- **`material/`**: Extension store assets, icons, screenshots, and review documentation.
- **Root configuration files**:
  - **`wxt.config.ts`**: WXT framework configuration (Vite settings, per-browser manifest generation).
  - **`tsconfig.json`**: Root TypeScript configuration extending `.wxt/tsconfig.json`.
  - **`eslint.config.js`**: Project-wide ESLint flat configuration.
  - **`package.json`**: Dependencies, npm scripts, and extension version.

### Dependency wiring in the background process

`src/entrypoints/background/index.ts` is the only place that creates the long-lived objects. It creates them in dependency order and passes them to the handlers through the `Deps` type (`deps.ts`):

```text
StorageManager  →  SettingsManager  →  ContentScriptManager
```

- `StorageManager`: a thin read and write layer over the browser's sync storage.
- `SettingsManager`: loads, saves, and initializes the settings, and judges the install state.
- `ContentScriptManager`: injects the content script into open tabs and broadcasts settings updates.

Handlers receive `deps` as an argument. Don't create module-level singletons in the other modules.

---

## 3. Import aliases

WXT generates `.wxt/tsconfig.json` and defines the following path aliases in it.

> [!IMPORTANT]
> WXT manages `.wxt/tsconfig.json`. Don't edit it manually.

| Alias | Resolves to | Description |
| :--- | :--- | :--- |
| `@` or `~` | `./src` | The `src/` directory |
| `@/*` or `~/*` | `./src/*` | Any path under `src/` |
| `@@` or `~~` | `.` (project root) | The project root |
| `@@/*` or `~~/*` | `./*` | Any path under the project root |

This project uses the `@/` form.

### Example

```typescript
// src/entrypoints/background/index.ts

// Not recommended: a relative path is hard to read in a deeply nested file.
import { safeAsync } from "../../assets/js/lib/safeAsync";

// Recommended: use the alias.
import { safeAsync } from "@/assets/js/lib/safeAsync";
import type { Messages } from "@/assets/js/types/Messages";
```

---

## 4. Cross-browser build

WXT and `wxt.config.ts` generate the Chrome build and the Firefox build from one codebase.

### Build flow

```text
npm run build:chrome:prod
    ↓
WXT CLI  --browser chrome --mv3
    ↓
getManifest(env) in wxt.config.ts
    ↓
env.browser === "chrome"
→ delete browser_specific_settings
→ output to .output/chrome-mv3/
```

```text
npm run build:firefox:prod
    ↓
WXT CLI  --browser firefox --mv3
    ↓
getManifest(env) in wxt.config.ts
    ↓
env.browser === "firefox"
→ delete minimum_chrome_version
→ output to .output/firefox-mv3/
```

### Manifest branching

`src/manifest.ts` defines the **base manifest** for both browsers. `getManifest()` in `wxt.config.ts` adjusts it for the build target:

```typescript
// wxt.config.ts (excerpt)
const getManifest: GetManifest = (env: ConfigEnv): UserManifest => {
  const { browser } = env;
  const mf: UserManifest = structuredClone(manifest);  // Deep copy so that the original isn't modified

  switch (browser) {
    case "chrome":
      delete mf.browser_specific_settings;
      break;
    case "firefox":
      delete mf.minimum_chrome_version;
      break;
    default:
      break;
  }

  return mf;
};
```

### Browser-specific manifest fields

| Field | Target | Content |
| :--- | :--- | :--- |
| `minimum_chrome_version` | Chrome only | The minimum supported version (`"125"`). |
| `browser_specific_settings.gecko` | Firefox only | The extension ID, the minimum version (`"152.0"`), and `data_collection_permissions`. |

### Content script registration

The manifest definition in `src/manifest.ts` doesn't include `content_scripts` on purpose. WXT generates this entry from `defineContentScript()` in `src/entrypoints/content/index.ts`. If you also define it in `src/manifest.ts`, WXT doesn't merge the two, and the built manifest contains duplicate entries for `content-scripts/content.js`.

### Output directories

| Build target | Output directory |
| :--- | :--- |
| Chrome | `.output/chrome-mv3/` |
| Firefox | `.output/firefox-mv3/` |

The `outDirTemplate: "{{browser}}-mv{{manifestVersion}}"` option in `wxt.config.ts` controls the path.

---

## 5. Browser API namespace

Write all browser API calls against the `browser` object that `wxt/browser` exports:

```typescript
// Recommended: the cross-browser API that WXT provides.
import { browser } from "wxt/browser";
browser.runtime.sendMessage({ message: "init" });

// Not allowed: don't call the Chrome-specific namespace directly.
chrome.runtime.sendMessage({ message: "init" });
```

This project doesn't use `chrome.*`. Use `import type { Browser } from "wxt/browser"` for the types, for example `Browser.runtime.MessageSender`.

### Why `wxt/browser`

- Chrome supports the `browser` namespace natively starting from **Chrome 148** (see [Migrating to the browser namespace](https://developer.chrome.com/docs/extensions/develop/concepts/browser-namespace)). This project supports Chrome 125 and later, so it can't rely on the native `browser` namespace.
- Importing `browser` from `wxt/browser` gives the same code a `browser` object in every supported version of Chrome and Firefox.

### Behavior that still differs by version

A common namespace doesn't remove every difference between the browsers. For example, a `runtime.onMessage` listener can return a Promise directly only in Chrome 148 and later. Because this project supports Chrome 125, **a listener must reply through `sendResponse` and return `true`**. See [Messaging](./messaging.md). For other differences, see [Browser differences](./browser-differences.md).

For UI that depends on the browser (for example, store links), use `src/assets/js/lib/detectBrowser.ts`.

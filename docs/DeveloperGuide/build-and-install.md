# Build and installation

This document describes how to set up the development environment, build the extension, and load it in a browser.

---

## Prerequisites

| Tool | Version | Check |
| :--- | :--- | :--- |
| [Node.js](https://nodejs.org/) | The latest LTS release (recommended) | `node --version` -- a version number starting with `v` appears if Node.js is available |
| [Git](https://git-scm.com/) | Any | `git --version` |

> [!NOTE]
> Some dependencies declare the Node.js versions that they support in their `engines` field, including the patch version. Keep Node.js up to date. If `npm ci` prints an `EBADENGINE` warning, update Node.js to the latest LTS release.

---

## Set up the environment

### 1. Clone the repository

```bash
git clone https://github.com/from-es/linkclump-plus.git
cd linkclump-plus
```

> [!IMPORTANT]
> The directory name `linkclump-plus` in the `cd` command above is for illustration purposes. Depending on how you obtained the source code (e.g. cloning into a custom directory, downloading a ZIP archive, or renaming the folder), your local directory name may differ.
>
> Navigate to the directory where **`package.json`** is located before running any commands. All `npm` commands must be executed from that directory.

### 2. Install dependencies

```bash
npm ci
```

If the installation succeeds, the terminal prints a summary such as `added X packages` and returns to the prompt.

> [!IMPORTANT]
> **Why use `npm ci` instead of `npm install`?**
>
> `npm ci` installs exactly the dependency tree in `package-lock.json` after it removes `node_modules/`. This keeps the builds reproducible across environments.
>
> - Use `npm ci` for the initial setup, after `package-lock.json` changes, and for a clean rebuild.
> - Use `npm install` only to add or upgrade packages.

After the installation, the `postinstall` hook runs `wxt prepare`, which generates the files under `.wxt/` (type definitions and `tsconfig.json`).

---

## Build commands

### Development mode (watch and reload)

```bash
npm run dev:chrome   # Chrome
npm run dev:firefox  # Firefox
```

> [!NOTE]
> The files that development mode generates are for development only. They aren't minified or optimized. Always use a production build for a public release.

The output goes to `.output/{browser}-mv3/`. When you change a source file, WXT rebuilds the extension and reloads it in the browser.

### Production build

```bash
npm run build:chrome:prod   # Chrome
npm run build:firefox:prod  # Firefox
```

### Production build with source maps

```bash
npm run build:chrome:prod:sourcemap   # Chrome
npm run build:firefox:prod:sourcemap  # Firefox
```

> [!NOTE]
> `wxt.config.ts` sets the `build.sourcemap` option to `true` only when the `--mode sourcemap` flag is passed to `wxt`.

Use a build with source maps to debug a production build. The `zip:*` commands don't enable source maps.

### Create a ZIP package for distribution

```bash
npm run zip:chrome   # For Chrome Web Store submission
npm run zip:firefox  # For Firefox Add-ons submission
```

The command writes `linkclump-plus-{version}-{browser}.zip` to `.output/`. The Firefox command also writes `linkclump-plus-{version}-sources.zip`, the source package for the Firefox Add-ons review.

---

## Static analysis and type checking

### TypeScript type check

```bash
npm run typecheck
```

Runs `tsc --noEmit`, which checks the types without writing any files.

### ESLint

```bash
npm run eslint
```

Runs ESLint on the `src/` and `tests/` directories. For the rules and the VS Code integration, see [ESLint](./eslint.md).

---

## Load the extension in a browser (development)

### Google Chrome

1. Open `chrome://extensions/`
2. Turn on **Developer mode** with the toggle in the upper-right corner.
3. Click **Load unpacked**.
4. Select the `.output/chrome-mv3/` directory.
5. If the manifest is valid, Chrome installs the extension and Linkclump Plus appears in the extensions list.

> [!NOTE]
> Chrome doesn't update an unpacked extension automatically. After you change the source, rebuild and reload the extension, unless you use `dev:chrome`.

### Mozilla Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on...**
3. Select the `manifest.json` file in `.output/firefox-mv3/`.
4. If the manifest is valid, Firefox loads the add-on temporarily and Linkclump Plus appears in the extensions list.

> [!NOTE]
> Firefox removes a temporary add-on when it restarts. Use `dev:firefox` during active development.

---

## Command reference

| Command | Description |
| :--- | :--- |
| `npm ci` | Install dependencies |
| `npm run dev:chrome` | Chrome development mode (auto-reload) |
| `npm run dev:firefox` | Firefox development mode (auto-reload) |
| `npm run build:chrome:prod` | Chrome production build |
| `npm run build:chrome:prod:sourcemap` | Chrome production build with source maps |
| `npm run build:firefox:prod` | Firefox production build |
| `npm run build:firefox:prod:sourcemap` | Firefox production build with source maps |
| `npm run zip:chrome` | Create Chrome ZIP package |
| `npm run zip:firefox` | Create Firefox ZIP package |
| `npm run typecheck` | TypeScript type check |
| `npm run eslint` | ESLint static analysis |
| `npm run vitest` | Run Vitest in watch mode |
| `npm run vitest:run` | Run all tests once |
| `npm run vitest:ui` | Open the Vitest browser UI |
| `npm run vitest:coverage` | Run tests and generate a coverage report |
| `npm run vitest:smoke` | Run smoke tests to verify the test environment |

---

## Next steps

- To test the extension manually, see [Testing](./testing.md) and [Quality assurance](./quality-assurance.md).
- To publish a release, see [Branching and release](./release-and-branching.md).

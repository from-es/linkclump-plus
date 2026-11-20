# Linkclump Plus: Developer guide

This directory contains the developer documentation for **Linkclump Plus**. For end-user documentation, see the [User guide](../UserGuide/README.md).

If you are contributing for the first time, start with [Build and installation](./build-and-install.md), then read [Architecture overview](./architecture.md) and [Testing](./testing.md) before making changes.

## Documents

### Get started

| Document | Contents |
| :--- | :--- |
| [Build and installation](./build-and-install.md) | Set up the development environment, build commands, and loading the extension in a browser |
| [Architecture overview](./architecture.md) | Tech stack, target browsers, directory structure, import aliases, cross-browser build, and the `browser` namespace |

### Design reference

| Document | Contents |
| :--- | :--- |
| [Messaging](./messaging.md) | Messages between the content script, the Options page, and the background process, and the rules for handlers |
| [Settings and storage](./settings-and-storage.md) | Storage keys, settings schema, Action evaluation order, install state, and the size limit |
| [Browser differences](./browser-differences.md) | Differences between Chrome and Firefox that affect the code |
| [Async and error handling](./async-and-error-handling.md) | No floating Promises, `safeAsync`, and concurrency |

### Conventions

| Document | Contents |
| :--- | :--- |
| [ESLint](./eslint.md) | ESLint configuration, custom rules, and VS Code integration |
| [Logging guidelines](./logging-guidelines.md) | Console log levels and message format |
| [Commit guidelines](./commit-guidelines.md) | Commit message format based on Conventional Commits |

### Quality and release

| Document | Contents |
| :--- | :--- |
| [Testing](./testing.md) | Vitest setup, test infrastructure, CLI commands, and how to write new tests |
| [Quality assurance](./quality-assurance.md) | Manual test procedures to run before a release |
| [Branching and release](./release-and-branching.md) | Branches, tags, and release steps |

# Commit guidelines

To keep the commit history readable and consistent, this project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification. Write commit messages in English.

---

## Message format

A commit message consists of a **header**, a **body**, and a **footer**. Separate them with a blank line.

```text
<type>[optional scope][!]: <description>

[optional body]

[optional footer]
```

1. **Header (required):** The first line. Keep it within 72 characters (ideally about 50).
2. **Body (optional):** A detailed explanation of the change. Wrap the lines at 72 characters.
3. **Footer (optional):** Issue references and breaking change notices. Wrap the lines at 72 characters.

---

## Types

| Type | Description |
| :--- | :--- |
| `feat` | A new feature. It corresponds to MINOR in Semantic Versioning. |
| `fix` | A bug fix. It corresponds to PATCH in Semantic Versioning. |
| `docs` | A documentation change only. |
| `style` | A change that doesn't affect behavior (formatting, whitespace, semicolons, and so on). |
| `refactor` | A code change that is neither a bug fix nor a new feature. |
| `perf` | A performance improvement. |
| `test` | Adding or changing tests. |
| `build` | A change to the build system or to the dependencies that the build needs (npm and so on). |
| `ci` | A change to the CI configuration or scripts (GitHub Actions and so on). |
| `chore` | Any other change that doesn't modify the source or the tests. |
| `revert` | A revert of a previous commit. |

### Breaking changes

A breaking change corresponds to MAJOR in Semantic Versioning. You can mark it in either of two ways, with any type:

> [!NOTE]
> Both formats are valid. For a one-line note, prefer the `!` shorthand. For a multi-line explanation, use `BREAKING CHANGE:` in the footer.


- Append `!` **immediately before the colon**, after the scope if there is one: `feat!:` or `refactor(storage)!:`.
- Write `BREAKING CHANGE:` at the start of a footer.

---

## Scopes

A scope names the part of the codebase that the commit affects. Use `project` for a change that spans several modules or the whole codebase. Omit the scope if none fits.

| Group | Scopes |
| :--- | :--- |
| Module | `background`, `content`, `options`, `storage`, `settings`, `bookmark`, `entrypoints` |
| Tooling and configuration | `config`, `eslint`, `deps`, `build`, `release`, `permissions` |
| Documentation and repository | `readme`, `github` |
| Other | `page` (manual test pages), `icon` |
| Project-wide | `project` |

---

## Body

The body explains the **what**, **why**, and **purpose** of the change, followed by specific implementation details.

- **Structure:** Write a summary (what / why / purpose) on the first line. Leave a blank line below the summary, then provide the detailed additions or modifications.
- **Formatting:**
  - **Multiple changes:** Use a bulleted list to keep each change clear and readable. End each bullet with a period.
  - **Single change:** Write a concise paragraph rather than a list.
- **Line length:** Wrap each line at **72 characters**.

---

## Footer

Use the footer to link the commit to related issues or tasks, or to document breaking changes. This keeps issue tracking up to date and provides essential context for future maintainers.

- **Issue references:** Reference issue IDs using `Refs: #123` or `Closes: #123`.
- **Breaking changes:** Start with `BREAKING CHANGE:`, followed by a clear explanation of what changed and the migration path or compatibility notes (see [Breaking changes](#breaking-changes)).

---

## Message conventions

- **Description:** Start with a lowercase letter, use the imperative mood, and don't end with a period.
- **Body bullet points:** End each bullet with a period.
- **Backticks:** Wrap file names, class names, method names, and commands in backticks (`` ` ``).
- **No filler adjectives:** Write factual statements only. Avoid words such as "robust", "secure", and "elegant".
- **Footers:** Reference issues with `Refs: #123` or `Closes: #123`.

---

## Examples

### New feature (`feat`)

```text
feat(options): add export and import buttons for settings

Add export and import buttons to the Options page.

- Add an export button that generates a JSON file of the current
  settings.
- Add an import button that reads and applies a JSON settings file.
```

### Bug fix (`fix`)

```text
fix(content): register the content script only once

The content script was registered twice. Remove the duplicate
`content_scripts` entry from `src/manifest.ts`.
```

### Breaking change

**Using a footer:**

```text
refactor(storage): change the settings data structure

BREAKING CHANGE: The structure of the settings object in
`browser.storage.sync` has changed. Old settings are no longer
compatible and are reset to the defaults on the first launch.
```

**Using `!`:**

```text
refactor(storage)!: change the settings data structure

The structure of the settings object in `browser.storage.sync` has
changed. Old settings are no longer compatible and are reset to the
defaults on the first launch.
```

### Documentation (`docs`)

```text
docs(readme): update the build instructions for Firefox
```

### Revert (`revert`)

```text
revert: feat(options): add export and import buttons for settings

This reverts commit 1a2b3c4.
```

### Dependency update

```text
chore(deps): update dayjs to v1.11.23
```

### Release

```text
chore(release): bump version to 2.17.0
```

For the release steps, see [Branching and release](./release-and-branching.md).

---

## Q&A

### Q. Which type do I use for a change to `package.json`?

It depends on the change:

- **Many dependencies at once (the usual update before a release):** `chore(deps): update dependencies`
- **One dependency that the build or the tooling needs (WXT, TypeScript, ESLint, and so on):** `build(deps):`

  ```text
  build(deps): update eslint to v10.12.0
  ```

- **One other dependency:** `chore(deps):`

  ```text
  chore(deps): update dayjs to v1.11.23
  ```

- **The version number of a release:** `chore(release):`

  ```text
  chore(release): bump version to 2.17.0
  ```

### Q. Which type do I use when I add a permission to `src/manifest.ts`?

It depends on why you add the permission:

- **To enable a new feature:** `feat`

  ```text
  feat(permissions): add the scripting permission for injection
  ```

- **To fix a bug that a missing permission causes:** `fix`

  ```text
  fix(permissions): add the missing clipboardWrite permission
  ```

---

## Official documentation

- [Conventional Commits specification](https://www.conventionalcommits.org/)

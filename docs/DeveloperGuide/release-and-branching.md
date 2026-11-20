# Branching and release

The repository history shows the following workflow (Git Flow style). Follow it unless the maintainers agree on a change.

## Branches

| Branch | Purpose |
| :--- | :--- |
| `main` | Released code. Each release is tagged on `main`. |
| `develop` | The integration branch for the next release. |
| `feature/<name>` | One feature, refactoring, or fix. It branches from `develop` and is merged back into `develop`. |
| `release/<version>` | The release preparation, such as `release/2.17.0`. It branches from `develop`. |

## Tags

A release tag is the plain version number, without a `v` prefix, for example `2.17.0`.

## Release steps

1. Create `release/<version>` from `develop`.
2. Update the dependencies if needed. Commit all updates together as `chore(deps): update dependencies`. For a single package, see the Q&A in [Commit guidelines](./commit-guidelines.md).
3. Increase the `version` in `package.json` (and in `package-lock.json`). `src/manifest.ts` reads the version from `package.json`. Commit the change as `chore(release): bump version to <version>`.
4. Run `npm run typecheck` and `npm run eslint`. If neither command reports errors, continue. Then run the checks in [Quality assurance](./quality-assurance.md).
5. Build the store packages with `npm run zip:chrome` and `npm run zip:firefox`. See [Build and installation](./build-and-install.md).
6. Merge `release/<version>` into `main` and tag the merge commit with `<version>`.
7. Merge the tag back into `develop`.
8. Upload the packages to the Chrome Web Store and to Firefox Add-ons.

See [Commit guidelines](./commit-guidelines.md) for the commit message format.

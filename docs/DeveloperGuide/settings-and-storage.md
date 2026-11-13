# Settings and storage

## Where settings are stored

The extension stores its settings with `browser.storage.sync` through `StorageManager`, which is a thin key-value wrapper without business logic. `SettingsManager` adds the domain logic (loading, saving, initializing, and version checks).

| Storage key | Constant | Content |
| :--- | :--- | :--- |
| `linkclumpSettings` | `linkclumpSettingsKey` | The `Settings` object (all Actions and the blocklist) |
| `linkclumpVersion` | `linkclumpVersionKey` | The settings format version (`CURRENT_VERSION`, currently `"5"`) |

The constants are in [`src/assets/js/constants/setting.ts`](../../src/assets/js/constants/setting.ts), which also holds `DEFAULT_SETTINGS`.

## Settings schema

```typescript
type Settings = {
  actions: Record<string, ActionSetting>;  // The key is the Action ID
  blocked: string[];                       // Blocklist entries (regular expressions)
};

interface ActionSetting {
  mouse: number;           // Index of the mouse button (0: left, 1: middle, 2: right)
  key: number;             // Key code (0: none, 16: Shift, 17: Ctrl, 18: Alt, 91: Cmd, or a letter key code)
  action: ActionType;      // "tabs" | "win" | "bm" | "copy"
  color: string;           // Selection box color
  options: ActionOptions;  // Options of the Action
}
```

The full definitions are in `src/assets/js/types/Settings.ts`. `isSettings` in `src/assets/js/lib/SettingsGuard.ts` is the runtime guard. Use it for every value that comes from storage, from an imported file, or from a message.

## Action IDs and evaluation order

- The default Action has the ID `101`. An Action that the user adds gets the current time in milliseconds (`Date.now()`) as its ID.
- Both the content script (`allowSelection`) and the Options page walk through `actions` with `for...in`. For string keys, JavaScript iterates the integer-like keys that are valid array indexes (such as `101`) in ascending order first, and then the other keys (such as 13-digit time stamps) in insertion order.
- As a result, **the order in which the Options page lists the Actions is the order in which the content script evaluates them**, and the first Action that matches the mouse button and key runs. An edited Action keeps its position, and a new Action is added at the end.
- Don't convert `actions` into a structure that changes the key order (for example, by sorting the keys) without changing both places.

## Install state and migration

`SettingsManager.getInstallState()` compares the stored `linkclumpVersion` with `CURRENT_VERSION`:

| State | Condition | What `initBackground` does |
| :--- | :--- | :--- |
| `first` | No version is stored | Saves the default settings, injects the content script into open tabs, and opens the Options page (`options.html?init=true`) in a window. |
| `outdated` | The stored version differs from `CURRENT_VERSION` | Nothing yet. A `TODO` marks the place for a migration. |
| `latest` | The versions are equal | Nothing. |

When you change the settings schema in a way that old data can't satisfy, increase `CURRENT_VERSION` and implement the migration in the `outdated` branch.

`SettingsManager.load()` doesn't use the install state. It validates the stored settings with `isSettings`. If the value is missing or invalid, `load()` calls `initialize()`, which **overwrites the stored settings with the defaults** and writes the current version. A corrupted or incompatible stored value is therefore reset without a message.

## Size limit

`storage.sync` limits the size of one item (about 8 KB). The extension stores all settings as **one item**, so a long blocklist or many Actions can exceed the limit. A failed save appears only in the console of the background process. See the user-facing description in [Notices](../UserGuide/Notices.md#settings-sync-storage-quota).

## Import and export

`src/assets/js/lib/SettingsFileManager.ts` implements the import and export of the settings as a JSON file on the Options page. An import is accepted only if `isSettings` returns `true`; otherwise the current settings stay unchanged.

## Blocklist

- Each entry is a case-insensitive regular expression (`src/assets/js/lib/regexp.ts`) that is tested against the full URL of the frame.
- The Options page validates every entry before it saves and refuses to save an invalid one.
- The content script reads the list in `applySettings`, so a change applies to open tabs without a reload.

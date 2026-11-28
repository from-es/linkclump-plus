# Linkclump Plus: Notices

> [!NOTE]
> This document is the detailed technical reference for Linkclump Plus. For short answers in Q&A form, see the [FAQ](./FAQ.md). For the description of each option, see the [User guide](./README.md).

---

## Activation settings

### Key availability by OS

The keys that you can use as triggers depend on your operating system. The Options page lists only the keys that are valid for the detected OS.

| Key | Windows | Linux | macOS |
| :--- | :---: | :---: | :---: |
| None (no key) + Left or Middle button | Yes | Yes | Yes |
| None (no key) + Right button | Yes | No | No |
| `Shift` | Yes | Yes | Yes |
| `Ctrl` | Yes | Yes | Yes |
| `Alt` | Yes | No (not offered) | Yes |
| `Cmd` (⌘) | Not applicable | Not applicable | Yes |
| Letter keys (`Z`, `D`, and so on) | Yes | Yes | Yes |

> [!IMPORTANT]
> **Right-click without a key isn't available on Linux and macOS.** The OS decides when the native menu opens (see the next section), and at that moment Linkclump Plus can't tell a drag from an ordinary right-click. Without a key, it would have to block the menu on every right-click. The Options page doesn't offer this combination on those systems.

> [!NOTE]
> **`Alt` isn't offered on Linux** because most Linux desktop environments (for example, GNOME, KDE, and Xfce) use `Alt` + drag to move windows, which conflicts with Linkclump Plus. Use `Shift`, `Ctrl`, or a letter key instead.

---

### Right-click `contextmenu` timing by OS

The OS decides when the browser fires the `contextmenu` event, which opens the native right-click menu. This applies to both Chrome and Firefox.

| OS | `contextmenu` fires on | Effect |
| :--- | :--- | :--- |
| **Windows** | Mouse **release** (`mouseup`) | The drag starts before the menu opens, so right-click works without a key. |
| **macOS and Linux** | Mouse **press** (`mousedown`) | The menu opens before Linkclump Plus can tell that you're dragging. To prevent this, Linkclump Plus has to block the menu at the moment of the press. Without a key, that would block the menu on every right-click, so a key is **required**. |

> [!WARNING]
> On macOS and Linux, when you use right-click as a trigger, **press the key before or at the same time as the mouse button.** If you press the mouse button first and the key even slightly later, the native menu can appear briefly and interrupt the selection.

---

### Mac: `Ctrl` + left-click acts as right-click

On macOS, the OS converts `Ctrl` + left-click into a right-click event (a legacy behavior from when trackpads had no right-click button). Linkclump Plus accounts for this when an Action is set to left-click + `Ctrl`. Because the underlying event is still a right-click, **the macOS right-click timing constraint above applies to this combination too.**

---

### Other OS-level interactions

- **Force Touch (Mac trackpad):** Pressing firmly can start Quick Look or a dictionary lookup, which interrupts the selection. To reduce this, turn off **Force Click and haptic feedback** in **System Settings** > **Trackpad**.
- **Two-finger click and drag (trackpad right-click):** Holding one finger down and dragging with a second finger is physically difficult on some trackpads. For right-click Actions, consider `Cmd` + left-click on macOS, or `Ctrl` or `Shift` + left-click on Windows and Linux.
- **Pinch to zoom:** The trackpad sends pinch gestures as `wheel` events with `ctrlKey`. They don't affect the drag selection, but if you pinch during a selection, the page can zoom at the same time.

---

## Laptop trackpad (palm rejection)

### Overview

On a **Windows or Linux** laptop, if you use a **letter key** (such as the default `Z`) as the trigger and you use the **built-in trackpad**, the selection might not start. The cause is the feature of the OS that prevents accidental touches while you type, not Linkclump Plus.

| OS | Feature name |
| :--- | :--- |
| Linux (`libinput`) | Disable While Typing (DWT) |
| Windows (Precision Touchpad) | Accidental Activation Prevention (AAP) |

While you press a key, and for a short time afterward, the OS ignores taps and movements on the built-in trackpad. Touches that start during that time don't move the cursor, so the drag can't create a selection box. The browser and Linkclump Plus can't detect or correct this.

- **Linux:** The `libinput` documentation states that some modifier keys (`Ctrl`, `Alt`, `Shift`, and `Fn`) don't trigger the feature, so `Ctrl` + click stays responsive. Physical trackpad buttons keep working while the trackpad is disabled, but the finger movement that you need for a drag is ignored.
- **Windows:** Microsoft documents that AAP suppresses mouse moves and taps for a short time after keyboard input. The documentation doesn't say that modifier keys are exempt. Modifier keys are reported to work, but this isn't confirmed.
- **Vendor drivers:** Some laptops use a vendor-specific driver (such as Synaptics or ELAN) instead of the Windows Precision Touchpad driver. These drivers can monitor all keystrokes at the system level, regardless of whether the keyboard is built-in or external. As a result, pressing a letter key on an **external** keyboard can still disable the built-in trackpad on such laptops. This behavior has been confirmed by a user.

### Behavior matrix

| OS | Keyboard | Key type | Pointing device | Works |
| :--- | :--- | :--- | :--- | :--- |
| Linux | Built-in | Letter (`Z`, `D`) | Built-in trackpad | No |
| Linux | Built-in | Modifier (`Ctrl`, `Shift`) | Built-in trackpad | Yes |
| Linux | Built-in | Letter (`Z`, `D`) | External mouse | Yes |
| Linux | **External** | Letter (`Z`, `D`) | Built-in trackpad | Yes (see the note below) |
| Windows | Built-in | Letter (`Z`, `D`) | Built-in trackpad | No |
| Windows | Built-in | Modifier (`Ctrl`, `Alt`, `Shift`) | Built-in trackpad | Yes (reported; not confirmed in Microsoft documentation) |
| Windows | Built-in | Letter (`Z`, `D`) | External mouse | Yes |
| Windows | **External** | Letter (`Z`, `D`) | Built-in trackpad | No (vendor driver monitors all keystrokes; see the note below) |

> [!NOTE]
> On Linux, `libinput` pairs the built-in trackpad only with the built-in keyboard, so typing on an external keyboard doesn't disable the trackpad. A few laptops, for example those with USB-connected keyboard modules, are treated as having an external keyboard, so the result can differ.
>
> On Windows, some laptops use a vendor-specific driver (such as Synaptics or ELAN) instead of the Windows Precision Touchpad driver. These drivers can monitor all keystrokes at the system level, regardless of whether the keyboard is built-in or external. On such laptops, typing on an external keyboard can still disable the built-in trackpad. This has been confirmed by a user. See **Vendor drivers** under [Laptop trackpad (palm rejection)](#laptop-trackpad-palm-rejection) for details.

### macOS

In the developer's investigation, macOS doesn't show the same symptom: pressing a letter key doesn't disable the built-in trackpad, so letter-key triggers are expected to work. **This hasn't been verified on real devices yet.** If you can reproduce the problem on a Mac, use a modifier key and report your hardware and macOS version on [GitHub Issues](https://github.com/from-es/linkclump-plus/issues).

### Solutions

#### Change the key of the Action (recommended)

On the Options page, change the key of the Action to a **modifier key**: `Ctrl`, `Shift`, or `Alt` (where available). If you use an external mouse, you aren't affected, and you can keep a letter key.

#### Weaken the OS feature

If you want to keep a letter key, you can change a setting of your OS. Try the modifier key first.

> [!CAUTION]
> These settings affect **the whole system and every application**, not only Linkclump Plus. With the feature weakened or turned off, your palm or thumb can move the cursor or cause accidental clicks and taps while you type, and the text you are typing can end up in the wrong place. Before you change a setting, note its current value so that you can restore it. If you notice new problems while you type, restore the setting.

- **Windows 11:** Open **Settings** > **Bluetooth & devices** > **Touchpad** > **Taps**, and set **Touchpad sensitivity** to **Most sensitive**. Microsoft documents that at the most sensitive level, the touchpad doesn't suppress mouse input after keyboard activity. On Windows 10, the setting is under **Settings** > **Devices** > **Touchpad**.
- **Linux:** Turn off the touchpad option that is usually named "Disable while typing" in the settings of your desktop environment. The name and the location depend on the environment. In GNOME, the setting is also available as the `disable-while-typing` key of `org.gnome.desktop.peripherals.touchpad`.

---

## Browser-specific notices

### Chrome and Firefox: right-click menu timing

The `contextmenu` timing difference (see [Right-click `contextmenu` timing by OS](#right-click-contextmenu-timing-by-os)) is the same in Chrome and Firefox because the OS determines it.

> [!CAUTION]
> **Firefox only:** A hidden setting, `ui.context_menus.after_mouseup` in `about:config`, can change the right-click menu timing on macOS and Linux to the Windows behavior (`mouseup`). If you turned this setting on, the macOS and Linux right-click constraint no longer applies to your environment. This is rare, and it matters only if you changed the setting yourself.

### Context menu suppression and text fields

Linkclump Plus suppresses the native context menu (`preventDefault`) only in the cases below. **There is no exception for text fields.**

- **Windows:** The menu is suppressed after a drag selection starts (when the box appears).
- **macOS:** Linkclump Plus decides when you press the button, and it suppresses the menu if the pressed mouse button and key match an Action. It also suppresses the menu after a drag selection starts.
- **Linux:** Linkclump Plus suppresses the menu while you hold a key that any Action uses, whichever mouse button you press. When you release the key, the menu works again.

For the reason behind the difference, see [Right-click `contextmenu` timing by OS](#right-click-contextmenu-timing-by-os).

If you use right-click as a trigger, the browser's menu (for example, the spell-check menu in a text field) can be suppressed or can appear, depending on your OS and on when you pressed the key.

### Middle-click autoscroll (Windows and Linux)

On Windows and Linux, Chrome and Firefox start **autoscroll** (a round scroll-anchor icon) when you middle-click. If you use middle-click as a trigger, this icon can appear briefly. Turn off autoscroll in your browser, or use a left-click combination.

### Settings sync storage quota

Linkclump Plus stores its settings in the browser's extension sync storage. The browser limits the size of each stored item (about 8 KB). Linkclump Plus stores all of its settings, including the blocklist, as **one item**. A long blocklist, many Actions, or an import of a large settings file can exceed the limit.

In Chrome, `storage.sync` also limits the total size (about 100 KB), the number of items (512), and the number of write operations (120 per minute and 1,800 per hour). Linkclump Plus stores its settings as one item, so the size of that item is the limit that you are most likely to reach.

When saving fails, **no error message appears on the screen**. The error appears only in the extension's background console. If your changes aren't kept, reduce the number of Actions or the length of the blocklist, reload the Options page, and check what was saved. Export your settings regularly.

### Background process lifecycle (delay and auto-close)

**delay in opening** and **close tab time** use in-memory timers (`setTimeout`) in the extension's background process.

- **Chrome:** The background process is a Manifest V3 service worker. It stops after an idle period (about 30 seconds without extension events).
- **Firefox:** The background process is a non-persistent event page. The browser also unloads it while it is idle.
- **When the process stops:** Timers that are still pending don't run. The remaining links of a delayed open aren't opened, and tabs aren't closed automatically.
- **Recommendation:** Keep both durations short, preferably 20 seconds or less.
- **Countdown start:** For **close tab time**, the countdown starts when the tab is created, not when the page finishes loading.
- **Tabs opened with a delay:** When **delay in opening** is greater than `0`, new tabs aren't linked to the tab you started from, so closing that tab doesn't stop the remaining links from opening.

---

## Bookmarked Action

### Save destination

For the location and structure of the saved folders, see [Bookmarked (`bm`)](./README.md#c-bookmarked-bm).

### What happens when saving fails

Linkclump Plus works through the following steps in order:

1. It finds or creates the `Linkclump Plus` folder in the selected location. If this fails, it tries the `Main` location instead. If that also fails, nothing is saved.
2. It finds or creates the timestamped folder. If this fails, nothing is saved.
3. It saves the links one by one. If one link can't be saved, the error is logged and the remaining links are still saved.

Because of step 1 and step 2, a failure to create the folders doesn't scatter links in other locations. Because of step 3, a failure on a single link can leave the folder with only some of the links.

Linkclump Plus writes errors to the browser console. It doesn't show a message on the screen.

### Known failure conditions

Saving bookmarks can fail in these environments:

1. **Managed browser (company or school policy):** An administrator made bookmark storage read-only.
2. **Firefox `places.sqlite` lock or full disk:** Another process locks the Firefox bookmark database, or the disk is full.

Chrome doesn't limit the number of bookmark write operations that an extension can perform, so a large number of saves in a short time isn't a cause of failure.

### Bookmarks that don't sync (Chrome)

Chrome Sync stops syncing bookmarks when the number of bookmarks in the profile exceeds its limit. The limit is about 100,000 on desktop and 20,000 on mobile; Google doesn't document these numbers. The limit applies to syncing, not to saving in the local profile, so Linkclump Plus saves bookmarks as usual, but the new bookmarks might not appear on your other devices. Chrome shows the error only on the `chrome://sync-internals` page.

---

## Deprecated configurations

### Mouse button without a key

> [!WARNING]
> Avoid using a mouse button **without a key**. The Options page shows the warning *"WARNING: Not using a key could cause unexpected behavior on some websites"*.

- **Right-click with no key (Windows only):** Possible, but it easily conflicts with other right-click tools and extensions.
- **Left-click or middle-click with no key:** It can't be told apart from normal clicks, text selection, or dragging. Linkclump Plus can start when you don't intend it to.

### Duplicate mouse and key combinations

> [!WARNING]
> Don't register the same combination of mouse button and key for more than one Action. The Options page shows the warning *"WARNING: The selected mouse/key match another action already setup"*.

If more than one Action has the same combination, Linkclump Plus checks the Actions in the order they are listed on the Options page, from top to bottom, and runs only the first match. The other Actions never run, even if their Action types differ (for example, **Opened as New Tabs** and **Bookmarked**). Remove the duplicate before you save.

Using the same key with **different** mouse buttons (for example, `Shift` + left-click and `Shift` + right-click) is valid and isn't a duplicate.

### Other

- **`Alt` key (Windows and macOS):** Even where `Alt` is available, it can conflict with shortcuts of the OS or the window manager. Prefer `Ctrl`, `Shift`, or a letter key.
- **Touch and mouse configurations:** See [Touch input](#touch-input). On 2-in-1 devices, the same Action can behave differently depending on whether you use touch or a mouse.

---

## Design limitations

### Selection is limited to one frame

Linkclump Plus runs separately in every frame of a page (the page itself and each embedded `<iframe>`). Each frame handles its own selection:

- The selection box is drawn inside the frame where the drag started. It never extends beyond that frame's visible area, even if the pointer moves into the parent page or another frame.
- Only the links of that frame are collected and counted. Links in other frames, including the parent page, aren't selected.
- To select links inside an `<iframe>`, start the drag inside that frame. If you start in the parent page and drag over the `<iframe>`, the links inside it aren't selected.
- The behavior is the same for same-domain and cross-domain frames. When an `<iframe>` is nested in another, the same rule applies to the frame where the drag started.
- The blocklist is also checked for each frame, using that frame's own URL.
- Frames without standard web URLs (such as `<iframe srcdoc="...">` or dynamic `about:blank` frames) are not supported. While they could theoretically be targeted, they are intentionally excluded to prevent blocklist circumvention and avoid instability in dynamic web apps and rich text editors.

This is intentional. Selecting across frames would require coordinating the frames and converting positions between them. That is fragile on pages with unusual styles, for example margins or transforms on the `body` element of a frame.

### Touch input

On touch screens, selection starts with a **long press of about 0.5 seconds**, followed by a drag. When the hold is recognized, supported devices vibrate for 30 ms.

A long press can't hold a key, so it runs the Action that is set to the **Left** mouse button:

- If an Action with the Left button and the key `None` exists, that Action runs.
- Otherwise, the first Action with the Left button in the list runs.

Other mouse button and key settings aren't used for touch. The following details also apply:

- If no Action uses the Left button, a long press doesn't start a selection.
- If you move your finger more than about 8 px before the hold is recognized, Linkclump Plus cancels the hold, and the page scrolls as usual.
- If you touch the screen while you hold a key on a physical keyboard, the selection starts at once, without the long press, and Linkclump Plus runs the Action that uses the Left button and that key.

---

## Limitations outside the extension's control

The OS, the browser, or the hardware causes the following behaviors. **Linkclump Plus can't fix them in its own code.**

- Mac Force Touch starts Quick Look or a dictionary lookup during a drag selection.
- The press-and-drag gesture is physically difficult on some trackpads.
- Users change the behavior themselves by modifying the Firefox setting `ui.context_menus.after_mouseup`.
- An OS window manager or a third-party tool (such as a mouse gesture tool or a launcher) intercepts a mouse button and key combination before it reaches the browser.
- The browser starts its native drag and drop before Linkclump Plus starts the drag selection, when you press on an image or a link.
- A site attaches its own handlers to `mousedown`, `contextmenu`, or `dragstart` (for example, map services and rich text editors).

---

## Known issues

### Opened links not marked as "Visited" (Chrome / Edge)

> [!NOTE]
> This is a **change in Google Chrome**, introduced in Chrome 136 (April 2025). It isn't a bug in Linkclump Plus.

Chrome 136 changed the behavior of the `:visited` CSS pseudo-class as part of the **Partitioned :visited links history** feature. Chrome now stores the visited state together with the site where you followed the link, so a link is styled as visited only on the site where you followed it. A site's links to its own pages are an exception: they appear as visited even if you didn't follow them from that site. Links that an extension (including Linkclump Plus) opens might not appear in the visited-link history of other pages, so their color does not change to the site's visited style after you open them. Chromium-based browsers that include the same change, such as Microsoft Edge, behave the same way.

- **Reference:** [Partitioning :visited links history (Chrome Platform Status)](https://chromestatus.com/feature/5101991698628608)

**Workarounds:**

- Use a browser that this change doesn't affect.
- Change the settings of Google Chrome (or Microsoft Edge) to go back to the previous behavior.

> [!CAUTION]
> Reverting the browser setting has a security cost. Chrome introduced the partitioning to prevent cross-site history sniffing attacks, and reverting it reduces that protection. Do this at your own risk.

Community instructions for reverting the setting (external links; their accuracy and safety aren't guaranteed):

- **Chrome and Chromium-based browsers:** [Reddit: links stay blue when using Imagus or opening them manually](https://www.reddit.com/r/imagus/comments/1j0v8k2/reddit_links_stay_blue_when_using_imagus_or/)
- **Microsoft Edge:** [Reddit: fix for visited links not turning purple on Edge](https://www.reddit.com/r/Enhancement/comments/1kecupw/fix_for_visited_links_not_turning_purple_on_edge/)

# Quality assurance: manual test procedures

This checklist describes the manual checks to perform before each release. The checks are organized by OS (Windows, macOS, and Linux). Run every check in both Chrome and Firefox.

> [!NOTE]
> **Audience:** Developers and testers.
> **When to run:** Before a release, and during a functional verification session.

## Before you start

1. Build the extension and load it in the browser. See [Build and installation](./build-and-install.md).
2. Open the Options page (click the extension icon and select **Options**, or open the extension's details page and click **Extension options**). Delete all existing Actions by clicking each Action's delete button. You can restore the default Action afterward by importing a backup from the **Import / Export** section.
3. Prepare the test pages:
  - The pages in `tests/page/` (see [Testing](./testing.md)).
  - `https://news.ycombinator.com/` as a page with many links. If a site changes, use another page with many links and adjust the words of the filters.
4. In the tests, "the Action" means the Action that you set for that test. Each test lists the **Settings**, the **Steps**, and the **Expected results**. A test passes only if every expected result is met.

> [!TIP]
> The names of the settings match the labels on the Options page, for example **delay in opening**, **close tab time**, and **block repeat links in selection**.

---

## Windows

### Action 1: Opened as New Tabs (right-click)

**Settings:**

- Trigger: Right-click, no key
- Selection box color: Red
- smart select: off
- delay in opening: 2 seconds
- reverse order: on
- block repeat links in selection: off

**Steps:**

1. Apply the settings.
2. Right-click and drag across several links on a page. Include one link twice if the page allows it.
3. Release the mouse button.
4. Right-click once on the page without dragging.

**Expected results:**

- The red selection box and the counter badge appear while you drag.
- After the release, the links open as new tabs in reverse order, with about 2 seconds between the tabs.
- A link that appears twice opens twice, because **block repeat links in selection** is off. The counter badge counts it once.
- The native context menu doesn't appear after the drag.
- The plain right-click in step 4 opens the native context menu.

---

### Action 2: Bookmarked (left-click + `Shift`)

**Settings:**

- Trigger: Left-click + `Shift`
- Selection box color: Green
- smart select: on
- block repeat links in selection: on
- select bookmarks: `Main`

**Steps:**

1. Apply the settings. Keep Action 1 so that right-click without a key is also registered.
2. Open `http://www.nationalgeographic.com/` (or another page with a search box) and type a misspelled word in the search box.
3. Right-click the misspelled word.
4. Hold `Shift` and left-click and drag across several links. Include links in a heading if the page has them.
5. Open the bookmark manager.

**Expected results:**

- In step 3, the spell-check suggestions appear (the plain right-click isn't suppressed).
- With smart select on, only the heading links are selected when the box contains at least one heading link.
- The links are saved in `Bookmarks bar` > `Linkclump Plus` > a folder that is named with the current date and time (`YYYY-MM-DD HH:mm:ss`). In Firefox, the location is `Bookmarks Menu` > `Linkclump Plus` > the timestamped folder.
- Each URL is saved once.
- Repeat step 4 after a few seconds. A second timestamped folder appears **above** the first one.

---

### Action 3: Opened as New Tabs (right-click + `Alt`)

**Settings:**

- Trigger: Right-click + `Alt`
- Selection box color: Blue
- filter links: exclude links with words (for example, `comments`)
- delay in opening: 2 seconds
- close tab time: 10 seconds
- open tabs at the end: on

**Steps:**

1. Apply the settings.
2. Open `https://news.ycombinator.com/`.
3. Hold `Alt`, right-click, and drag across several story links and their "comments" links.
4. Watch the tab bar for at least 20 seconds.

**Expected results:**

- The "comments" links aren't opened.
- The new tabs appear at the far right of the tab bar, with about 2 seconds between them.
- Each new tab closes about 10 seconds after it was created. If tabs do not close, the background process may have stopped. See [Background process lifecycle](../UserGuide/Notices.md#background-process-lifecycle-delay-and-auto-close).

---

### Action 4: Opened in a New Window (right-click + `Ctrl`)

**Settings:**

- Trigger: Right-click + `Ctrl`
- Selection box color: Yellow
- filter links: include links with words (for example, `github`)

**Steps:**

1. Apply the settings.
2. Hold `Ctrl`, right-click, and drag across links where only some match the word.

**Expected results:**

- A new window opens and contains only the links that match the word.
- The focus moves to the new window.

---

### Windows: other checks

- [ ] **Laptop trackpad** (Windows laptop only): Set an Action to a letter key, and drag with the built-in trackpad. The selection doesn't start. Change the key to `Ctrl`, `Shift`, or `Alt`, and check that the selection starts. Record the result: Microsoft's documentation doesn't confirm that modifier keys are exempt, so update [Notices](../UserGuide/Notices.md#laptop-trackpad-palm-rejection) if the result differs. Then set **Touchpad sensitivity** to **Most sensitive**, and check that the letter key works. Restore the original setting afterward.
- [ ] **Laptop with an external keyboard** (Windows laptop only): Repeat the letter-key check with an external keyboard, and record whether the built-in trackpad still stops working. A user confirmed that on a laptop with a vendor-specific driver (Synaptics or ELAN), an external keyboard also disables the built-in trackpad. The matrix in Notices reflects this. If the result on your hardware differs, update [Notices](../UserGuide/Notices.md#laptop-trackpad-palm-rejection).
- [ ] **Persistence:** Restart the browser. All settings are still there.

---

## macOS

### Action 1: Opened in a New Window (left-click + `X`)

**Settings:**

- Trigger: Left-click + `X`
- Selection box color: Blue
- smart select: on
- delay in opening: 1 second

**Steps:**

1. Apply the settings.
2. Use the **built-in trackpad**, not an external mouse. Hold `X`, click, and drag across several links.
3. In the original window, drag across links **without** holding `X`.

**Expected results:**

- The selection starts with the built-in trackpad while `X` is held. If it doesn't start, record the Mac model and the macOS version. The documentation currently states that macOS isn't affected by palm rejection but that this isn't verified (see [Notices](../UserGuide/Notices.md#macos)). Update that section with the result of this check.
- A new window opens with the selected links.
- The drag without the key doesn't draw a box and doesn't open anything.

---

### Action 2: Copied to Clipboard (right-click + `Alt`)

**Settings:**

- Trigger: Right-click + `Alt`
- Selection box color: White
- smart select: off
- reverse order: on
- copy format: `URLS with titles`

**Steps:**

1. Apply the settings.
2. Hold `Alt`, right-click, and drag across several links.
3. Paste the clipboard into a text editor.

**Expected results:**

- The native context menu doesn't appear.
- The editor shows one line per link in reverse order. Each line contains the title, a tab, and the URL.

---

### Action 3: Opened as New Tabs (left-click + `Ctrl`)

**Settings:**

- Trigger: Left-click + `Ctrl`
- Other settings: the defaults

**Steps:**

1. Apply the settings.
2. Hold `Ctrl`, click, and drag across several links.

**Expected results:**

- The selection works and the links open as new tabs.
- The native context menu doesn't appear. If it appears, record the result and update [Notices](../UserGuide/Notices.md#mac-ctrl--left-click-acts-as-right-click).

---

### macOS: other checks

- [ ] **Persistence:** Restart the browser. All settings are still there.

---

## Linux

### Action 1: Copied to Clipboard (right-click + `Y`)

**Settings:**

- Trigger: Right-click + `Y`
- Selection box color: Gold
- smart select: on
- copy format: `as link HTML`

**Steps:**

1. Apply the settings.
2. Hold `Y`, right-click, and drag across several links. Use a mouse, or a trackpad on a laptop whose keyboard is external.
3. Paste the clipboard into a text editor.

**Expected results:**

- The native context menu doesn't appear.
- The editor shows one `<a href="URL">Title</a>` per line.
- `Alt` isn't in the key list of the Options page.

---

### Action 2: Opened as New Tabs (left-click, no key)

This combination is deprecated. The test checks that the extension doesn't break normal clicks.

**Settings:**

- Trigger: Left-click, no key
- Selection box color: Gray
- smart select: off
- reverse order: on
- filter links: exclude links with words (for example, `comments`)

**Steps:**

1. Apply the settings.
2. Check that the Options page shows the warning about not using a key.
3. In the guide area of the Options page, click a link without dragging.

**Expected results:**

- The warning appears in step 2.
- The link in step 3 loads normally and no selection box appears.

---

### Linux: other checks

- [ ] **Laptop trackpad** (Linux laptop only): Set an Action to a letter key, and drag with the built-in trackpad. The selection doesn't start. Change the key to `Ctrl` or `Shift`, and the selection starts. Then turn off "Disable while typing" in the desktop settings, and check that the letter key works. Restore the original setting afterward.
- [ ] **Persistence:** Restart the browser. All settings are still there.

---

## Checks for every OS

Run these checks once per browser.

### Bookmarked Action

- [ ] The folder structure matches [Bookmarked (`bm`)](../UserGuide/README.md#c-bookmarked-bm) for `Main` and for `Other bookmarks`.
- [ ] Two saves within the same second share one timestamped folder, and no duplicate `Linkclump Plus` folder appears.

### Settings and the Options page

- [ ] The duplicate-trigger warning appears when two Actions have the same mouse button and key. With duplicates saved, only the Action that is listed first runs.
- [ ] A blocklist entry such as `example.com` turns Linkclump Plus off on that site in tabs that are already open, without a reload.
- [ ] An invalid blocklist entry (for example, `*.example.com`) isn't saved and shows an error.
- [ ] Export, and then import, the settings. The Actions and the blocklist are restored. Importing a file that isn't a settings file leaves the current settings unchanged.

### Frames and touch

- [ ] On a page with an `<iframe>`, a drag that starts inside the frame selects only the links of that frame, and a drag that starts in the parent page doesn't select the links inside the frame.
- [ ] In an `about:srcdoc` or `about:blank` `<iframe>`, Linkclump Plus does not activate (native browser selection applies) due to stability and blocklist integrity constraints.
- [ ] On a touch screen, a long press of about 0.5 seconds starts the selection, and the Action of the Left button runs.

### Test pages

- [ ] Every page that `tests/page/index.html` links to behaves as described on the page.

# Linkclump Plus: FAQ

> [!NOTE]
> This document answers common questions about the Options page and general usage. For technical details, see [Notices](./Notices.md). For the full description of each option, see the [User guide](./README.md).

---

## Quick reference

If you are troubleshooting a problem, start with [Troubleshooting](#troubleshooting). For configuration questions, see [Activation](#activation-mouse-and-key-settings) and [Settings and storage](#settings-and-storage).

---

## Activation (mouse and key settings)

### Q. Link selection doesn't work when I use my laptop's built-in trackpad. What should I do?

**A.** The cause is your OS, not Linkclump Plus. While you press a **letter key**, such as the default `Z`, the OS of a Windows or Linux laptop ignores taps and movements on the built-in trackpad. The drag can't start, and Linkclump Plus can't detect or correct this.

**Solution:** On the Options page, change the **key** of the Action from a letter key to a **modifier key**: `Ctrl`, `Shift`, or `Alt` (Windows only). If you use an **external mouse**, letter keys work normally. On Windows, modifier keys are reported to work, but Microsoft's documentation doesn't confirm it.

> [!NOTE]
> On **macOS**, this problem isn't expected, but it hasn't been verified on real devices yet. If a letter key doesn't work with your Mac's trackpad, use a modifier key and report the problem on [GitHub Issues](https://github.com/from-es/linkclump-plus/issues).

For the causes, the combinations that work, laptops with a vendor-specific driver, and the OS settings that you can change, see [Laptop trackpad (palm rejection)](./Notices.md#laptop-trackpad-palm-rejection).

---

### Q. Why can't I set right-click without a key on Linux or macOS?

**A.** On Linux and macOS, the browser fires the `contextmenu` event (which opens the right-click menu) when you **press** the mouse button (`mousedown`), before Linkclump Plus can tell that you're dragging. To prevent the menu, Linkclump Plus has to block it at that moment. Without a key, it would have to block the menu on every right-click.

For this reason, the Options page doesn't offer "Right-click with no key" on Linux and macOS. Always combine right-click with a key, such as `Shift`, `Ctrl`, or `Cmd` (macOS).

On **Windows**, the event fires when you **release** the button (`mouseup`), so right-click with no key is possible, but it isn't recommended. See [Deprecated configurations](./Notices.md#deprecated-configurations). For details, see [Right-click `contextmenu` timing by OS](./Notices.md#right-click-contextmenu-timing-by-os).

---

### Q. The `Alt` key isn't in the key list on Linux. Is this a bug?

**A.** No. `Alt` is intentionally not offered on Linux. Many Linux desktop environments (for example, GNOME and KDE) use `Alt` + drag to move windows, which conflicts with drag selection. Use `Shift`, `Ctrl`, or a letter key instead. For a reliable trigger on Linux, use left-click with `Ctrl`.

---

### Q. On macOS, `Ctrl` + left-click behaves like a right-click. Is this expected?

**A.** Yes. macOS converts `Ctrl` + left-click to a right-click at the OS level. Linkclump Plus accounts for this when an Action is set to left-click + `Ctrl`, but the underlying event is still a right-click. As a result, the macOS right-click timing constraint applies to this combination too. See [Mac: Ctrl + left-click acts as right-click](./Notices.md#mac-ctrl--left-click-acts-as-right-click).

---

### Q. I registered the same mouse button and key for two Actions. What happens?

**A.** The Options page shows the warning *"WARNING: The selected mouse/key match another action already setup"*. If you save anyway, Linkclump Plus checks the Actions in the order they are listed on the Options page, from top to bottom, and runs only the first match. The other Action never runs. Remove the duplicate before you save.

Using the same key with **different** mouse buttons (for example, `Shift` + left-click and `Shift` + right-click) isn't a duplicate.

---

### Q. The Options page shows "WARNING: Not using a key could cause unexpected behavior on some websites". Should I be concerned?

**A.** Yes. An Action that uses a mouse button without any key is hard to tell apart from normal clicks, text selection, and link dragging, so it can start when you don't intend it to. Combine the mouse button with a modifier key or a letter key. For details, see [Deprecated configurations](./Notices.md#deprecated-configurations).

---

### Q. Middle-click sometimes shows an autoscroll icon. How do I prevent it?

**A.** On Windows and Linux, Chrome and Firefox start **autoscroll** (a round icon) when you middle-click. If you use middle-click as a trigger, this icon can appear briefly. To avoid it, turn off autoscroll in your browser settings, or use a left-click combination.

---

## Bookmarked Action

### Q. Where are bookmarks saved?

**A.** Linkclump Plus saves the links in a timestamped folder inside a `Linkclump Plus` folder. The location of the `Linkclump Plus` folder depends on the **select bookmarks** setting and your browser. For the exact locations and folder structure, see [Bookmarked (`bm`)](./README.md#c-bookmarked-bm).

---

### Q. Saving bookmarks failed. What are the possible causes?

**A.** Failures are rare. See [Bookmarked Action](./Notices.md#bookmarked-action) for the known causes and for what Linkclump Plus does when saving fails. When a failure occurs, the browser console shows an error, but nothing appears on the screen.

---

## Settings and storage

### Q. Are my settings kept after I restart the browser?

**A.** Yes. Linkclump Plus stores your settings in your browser's extension sync storage, which persists across restarts. If you are signed in to your browser account and sync is on, the settings are also synced to your other devices.

---

### Q. Can I use the same settings in Chrome and Firefox?

**A.** Not automatically. Sync works only within one browser's own account system. To move settings between Chrome and Firefox, use **Export** and **Import** on the Options page.

> [!NOTE]
> A large number of Actions or a long blocklist can exceed the browser's storage limit. When saving fails, **no message appears on the screen**; the error appears only in the extension's background console. If your changes aren't kept, reduce the number of Actions or the length of the blocklist, reload the Options page, and check what was saved. See [Settings sync storage quota](./Notices.md#settings-sync-storage-quota).

---

### Q. How do I turn off Linkclump Plus on a specific site or path?

**A.** Add an entry to the **blocklist** at the bottom of the Options page:

- **A specific site:** Enter `https://example.com/`. Starting with `https://` prevents accidentally matching other domains such as `notexample.com` (add `www.example.com` or `http://` on separate lines if needed).
- **A domain and all its subdomains:** Enter `example.com`. Don't enter `*.example.com`.
- **One subdomain only:** Enter `https://mail.google.com/`.
- **One path, with the top page still active:** Enter `https://example.com/editor/`.

Changes apply to all open tabs without reloading. For regular expressions and advanced matching, see [Blocked sites (blocklist)](./README.md#5-blocked-sites-blocklist).

---

## Troubleshooting

### Q. Selection doesn't work inside an `<iframe>`, or the box stops at the edge of a frame.

**A.** Selection is limited to one frame. The box and the links it selects belong to the frame where you start the drag. To select links inside an `<iframe>`, start the drag **inside** that frame. This applies to both same-domain and cross-domain frames. See [Selection is limited to one frame](./Notices.md#selection-is-limited-to-one-frame).

---

### Q. Can I use Linkclump Plus on a touch screen?

**A.** Yes. Press and hold for about 0.5 seconds, and then drag. For which Action runs and for other details, see [Touch input](./Notices.md#touch-input).

---

### Q. When does the auto-close timer (**close tab time**) start, and how long can it be?

**A.** The timer starts when the tab is created, not when the page finishes loading. Both **close tab time** and **delay in opening** use timers in the background process, which the browser can stop while it is idle. For this reason, keep the durations short. See [Background process lifecycle (delay and auto-close)](./Notices.md#background-process-lifecycle-delay-and-auto-close).

---

### Q. It doesn't work on local files (`file://` URLs).

**A.** By default, extensions cannot access local files for security reasons. To use Linkclump Plus on pages with `file://` URLs, you must explicitly grant access from your browser's extension management page.

- **Google Chrome and Chromium-based browsers:**
  1. Open `chrome://extensions` in the address bar.
  2. Click **Details** for Linkclump Plus.
  3. Turn on **Allow access to file URLs**.

- **Mozilla Firefox and Firefox-based browsers:**
  - **Version 153 and later:**
    1. Open `about:addons` in the address bar.
    2. Select **Manage** from the Linkclump Plus menu.
    3. Select **Permissions and data**.
    4. Turn on **Access local files on your computer**. The switch is listed as an optional permission.
  - **Version 152 or earlier:**
    1. Open `about:addons` in the address bar.
    2. Select **Manage** from the Linkclump Plus menu.
    3. Select **Permissions and data**.
    4. Turn on **Access your data for all websites**.

---

### Q. It doesn't work on store pages, extension pages, or browser internal pages.

**A.** For security reasons, browsers don't run extensions on some pages. Linkclump Plus can't change this.

- **Chrome and Chromium-based browsers:** The Chrome Web Store, extension pages, and internal pages such as `chrome://` pages.
- **Firefox and Firefox-based browsers:** The Mozilla Add-ons site (`addons.mozilla.org`), some other Mozilla sites, and internal pages such as `about:` pages.

---

### Q. Tabs open twice, or two counters appear when I select links.

**A.** Another extension that does the same job is probably running too. If the original Linkclump, or an extension such as Snap Links Lite, is installed and turned on, both extensions react to the same drag. Tabs open twice, and two counters appear. Turn off or remove the other extension.

> [!NOTE]
> The counter of Linkclump Plus always counts unique URLs. Even if **block repeat links in selection** is off, a link that appears more than once is counted once.

---

### Q. The selection box and the cursor are misaligned on some pages.

**A.** This happens on pages whose `body` element has a fixed `width`, `min-width`, or `max-width` together with `margin: 0 auto`. Linkclump Plus positions the box relative to the page origin, but the browser centers a constrained `body` like this, so the two coordinate systems differ and the box drifts.

**Workaround:** Override the page style with [Stylus](https://chromewebstore.google.com/detail/stylus/clngdbkpkpeebahjckkjfobafhncgmne).

1. Install the **Stylus** extension.
2. Create a new style for the affected site.
3. Add the following CSS. Change the width to match the site.

```css
/* Step 1: Remove the width constraint from body. */
body {
  margin: 0 !important;
  width: initial !important;  /* or min-width / max-width, as needed */
}

/* Step 2: Apply the width to the direct children of body. */
header, nav, main, footer {
  margin-left: auto;
  margin-right: auto;
  width: 1080px;  /* replace with the site's original value */
}
```

> [!NOTE]
> The selectors and the width depend on the site. Use your browser's developer tools to find the right values.

---

### Q. Links that I opened aren't marked as visited (link color doesn't change). Why?

**A.** This is a change in **Google Chrome** (Chrome 136, April 2025), not a bug in Linkclump Plus. Chrome now partitions the `:visited` link history by site (**Partitioned :visited links history**), so links that an extension opens may not appear as visited on other pages (their color does not change to the site's visited style). For background, workarounds, and security considerations, see [Opened links not marked as "Visited" (Chrome / Edge)](./Notices.md#opened-links-not-marked-as-visited-chrome--edge).

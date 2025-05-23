# Linkclump Plus

## About

The [Linkclump](https://chromewebstore.google.com/detail/linkclump/lfpjkncokllnfokkgpkobnkbkmelfefj "https://chromewebstore.google.com/detail/linkclump/lfpjkncokllnfokkgpkobnkbkmelfefj") are no longer available when Google Chrome browser support for Manifest v2 ends. This [Linkclump Plus](https://chromewebstore.google.com/detail/linkclump-plus/ainlglbojoodfdbndbfofojhmjbmelmm "https://chromewebstore.google.com/detail/linkclump-plus/ainlglbojoodfdbndbfofojhmjbmelmm") is a fork of [linkclump-ng](https://github.com/wvanderp/linkclump "https://github.com/wvanderp/linkclump") with some fixes and additional features.

[linkclump-ng](https://github.com/wvanderp/linkclump "https://github.com/wvanderp/linkclump") is a fork from [Linkclump](https://github.com/benblack86/linkclump "https://github.com/benblack86/linkclump") and has been updated to Manifest v3.

Thanks to [benblack86](https://github.com/benblack86 "https://github.com/benblack86") for creating this amazing extension and [wvanderp](https://github.com/wvanderp "https://github.com/wvanderp") for updating it to manifest v3.

## Support

Please note that as this is a free extension the developer is unable to offer individual support.

If you have any issues or feature requests, please report them at GitHub (https://github.com/from-es/linkclump-plus/issues).

## Installation

Install it by visiting the [Linkclump Plus - Chrome Web Store](https://chromewebstore.google.com/detail/ainlglbojoodfdbndbfofojhmjbmelmm "Linkclump Plus - Chrome Web Store").

## Build

Assuming that [Node.js](https://nodejs.org/ "https://nodejs.org/") is installed.

1. clone this repository locally or download the file.
2. place the file in any local directory.
3. move it to the directory where **package.json** is located.
3. run ```npm install``` to install dependencies.
4. build the extension into the **.output** directory.
	- ```npm run dev``` build the extension in **Development** mode.
	- ```npm run build``` build the extension in **Production** mode.
	- ```npm run build:sourcemap``` build the extension (with **source maps**) in **Production** mode.

## Known Issues

### When selecting a range on some pages, the cursor and box positions are misaligned

This occurs when the following style is specified for the body element of the accessed page.

```
bode {
	margin: 0 auto;
	width: 1080px; /* or "min-width: 1080px;" or "max-width: 1080px;" */
}
```

This issue may be resolved by using [Stylus](https://chromewebstore.google.com/detail/stylus/clngdbkpkpeebahjckkjfobafhncgmne "https://chromewebstore.google.com/detail/stylus/clngdbkpkpeebahjckkjfobafhncgmne") to overwrite the style specified for the body element of the page as follows.

```
/* How to deal with misalignment when selecting with mouse (reference example) */

/*
	The style sheet applied to the body element is overwritten
*/
body {
	margin: 0 !important;
	width: initial !important; /* or "min-width: initial !important;" or "max-width: initial !important;" */
}

/*
	The width specification that was assigned to the body element is reassigned
	 to the element directly below the body element
*/
header, nav, main, footer {
	margin-left: auto;
	margin-right: auto;

	width: 1080px; /* or "min-width: 1080px;" or "max-width: 1080px;" */
}
```

### "Linkclump Plus" Opened Links not marking as "Visited"

If opened links are not marked as “visited”, then that is a Google Chrome specification; the behavioural specification changed in an update in early 2025/03. For more information on this change, see the following article.

Partitioning :visited links history - Chrome Platform Status  
https://chromestatus.com/feature/5101991698628608

Countermeasures include

- Switch to a browser that is not affected by this change
- Change Google Chrome settings to revert to the previous behavior

On Reddit, there were instructions on how to change browser settings to address this issue. If you refer to this, please be aware that there are security risks and do so at your own risk.

#### for Google Chrome or Chromium-based browsers

Reddit links stay blue when using Imagus or opening them manually  
https://www.reddit.com/r/imagus/comments/1j0v8k2/reddit_links_stay_blue_when_using_imagus_or/

#### for Microsoft Edge

Fix for visited links not turning purple on Edge  
https://www.reddit.com/r/Enhancement/comments/1kecupw/fix_for_visited_links_not_turning_purple_on_edge/

## Related Link

- Linkclump
	- [Linkclump - Chrome Web Store](https://chromewebstore.google.com/detail/linkclump/lfpjkncokllnfokkgpkobnkbkmelfefj "https://chromewebstore.google.com/detail/linkclump/lfpjkncokllnfokkgpkobnkbkmelfef")
	- [benblack86/linkclump - Github](https://github.com/benblack86/linkclump "https://github.com/benblack86/linkclump")
- Linkclump-ng
	- [wvanderp/linkclump - Github](https://github.com/wvanderp/linkclump "https://github.com/wvanderp/linkclump")
- Linkclump Plus
	- [Linkclump Plus - Chrome Web Store](https://chromewebstore.google.com/detail/ainlglbojoodfdbndbfofojhmjbmelmm "Linkclump Plus - Chrome Web Store")
	- [from-es/linkclump-plus - Github](https://github.com/from-es/linkclump-plus "https://github.com/from-es/linkclump-plus")
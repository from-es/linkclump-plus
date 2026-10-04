import type { LinkItem } from "@/assets/js/types/Content";
import type { OsType } from "@/assets/js/types/OS";
import type { ActionSetting } from "@/assets/js/types/Settings";

// set all the properties of the window object
// to avoid typescript errors
declare global {
	interface Window {
		settings: Record<string, ActionSetting>;
		setting: number;

		key_pressed: number;
		mouse_button: number | null;
		stop_menu: boolean;
		box_on: boolean;
		smart_select: boolean;

		mouse_x: number;
		mouse_y: number;

		scroll_id: number;
		links: LinkItem[];
		box: HTMLElement & { x: number, y: number, x1: number, x2: number, y1: number, y2: number };
		count_label: HTMLElement;
		linkclump: HTMLElement;
		overlay: HTMLElement | null;
		scroll_bug_ignore: boolean;
		os: OsType;

		timer: number;
		touch_active: boolean;
		pointer_type: string | null;
	}
}

// This file already becomes a module because of the `import type` statements above, which
// is what allows `declare global` to augment the global Window interface instead of being
// parsed as this file's own disconnected `global` block. The explicit `export {}` is a
// safety net: if those type imports are ever removed (e.g. during further refactoring),
// this file would silently fall back to "script" mode, `declare global` would stop merging
// into the real global scope, and every file touching `window.*` would start failing to
// compile with no error ever pointing back to this file. Keep this line even if the file
// ends up with no other imports or exports.
export {};

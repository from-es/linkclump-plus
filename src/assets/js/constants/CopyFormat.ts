import type { CopyFormat } from "@/assets/js/types/Settings";

/**
 * Defines clipboard link formatting options for the "copy" action.
 *
 * Role:
 * Specifies the output text format (e.g., plain URL, title with URL, HTML anchor,
 * or Markdown) when copied links are placed onto the clipboard.
 *
 * Note on assigned values:
 * The assigned numeric values (0 through 6) serve purely as classification identifiers
 * in internal logic (such as option selection indexes and background
 * dispatch branching), and do not convey arithmetic magnitude or semantic order.
 */
export const CopyFormatType = {
	/** URL with title separated by tab and newline (0) */
	URLS_WITH_TITLES: 0,

	/** URL only separated by newline (1) */
	URLS_ONLY: 1,

	/** URL only separated by space (2) */
	URLS_ONLY_SPACE_SEPARATED: 2,

	/** Title only separated by newline (3) */
	TITLES_ONLY: 3,

	/** Formatted as HTML anchor tag (4) */
	AS_LINK_HTML: 4,

	/** Formatted as HTML list items with anchor tag (5) */
	AS_LIST_LINK_HTML: 5,

	/** Formatted as Markdown link (6) */
	AS_MARKDOWN: 6,
} as const satisfies Record<string, CopyFormat>;

// Exhaustive check: verify that all values of union CopyFormat are covered by CopyFormatType constant
type _Exhaustive = CopyFormat extends (typeof CopyFormatType)[keyof typeof CopyFormatType] ? true : never;
const _check: _Exhaustive = true;
void _check;

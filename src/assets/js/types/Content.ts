export type LinkElement = HTMLAnchorElement | HTMLAreaElement;

/**
 * Extended DOM element representing a link with Linkclump bounding coordinates and state.
 */
export type LinkItem = LinkElement & {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	height: number;
	width: number;
	box: HTMLElement | null;
	important: boolean;
};

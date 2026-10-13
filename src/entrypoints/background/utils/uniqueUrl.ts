/**
 * Removes duplicate URLs from the given array, preserving order.
 *
 * @template T
 * @param {T[]} arr - Array of items containing URL strings.
 * @returns {T[]} Array with duplicate URLs removed.
 */
export function uniqueUrl<T extends { url: string }>(arr: T[]): T[] {
	const checklist = new Set<string>();
	const unique = arr.filter(
		(obj) => {
			if (checklist.has(obj.url)) {
				return false;
			} else {
				checklist.add(obj.url);
			}

			return true;
		}
	);

	return unique;
}

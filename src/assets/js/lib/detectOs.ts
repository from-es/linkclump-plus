import {
	OS_WIN,
	OS_LINUX,
	OS_MAC
} from "@/assets/js/constants/os";

import type { OsType } from "@/assets/js/types/OS";



interface NavigatorUAData {
	platform: string;
}

/**
 * Detects the client operating system using User-Agent Client Hints
 * with fallback to navigator.platform and navigator.userAgent.
 *
 * @returns {OsType} OS_WIN (0), OS_LINUX (1), or OS_MAC (2).
 */
export function detectOs(): OsType {
	const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData;
	const platform = uaData?.platform || navigator.platform || navigator.userAgent || "";

	if (/Win/i.test(platform)) {
		return OS_WIN;
	}

	if (/Mac|iPhone|iPad|iPod/i.test(platform)) {
		return OS_MAC;
	}

	return OS_LINUX;
}

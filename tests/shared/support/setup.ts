import { vi } from "vitest";

// Base mocks common to all tests (wxt/browser, runtime manifest, etc.)
vi.mock("wxt/browser", () => ({
	browser: {
		runtime: {
			getManifest: vi.fn(() => ({
				author: "From E",
				name: "Linkclump Plus",
				version: "2.17.1"
			})),
			getURL: vi.fn((path: string) => `chrome-extension://dummy-extension-id${path}`),
			sendMessage: vi.fn(),
			id: "dummy-extension-id"
		},
		// Stubs for background APIs. Each test sets return values explicitly (mockResolvedValue, etc.).
		tabs: {
			create: vi.fn(),
			get: vi.fn(),
			query: vi.fn(),
			remove: vi.fn(),
			sendMessage: vi.fn()
		},
		storage: {
			sync: {
				get: vi.fn(),
				set: vi.fn()
			}
		},
		scripting: {
			executeScript: vi.fn()
		},
		windows: {
			getAll: vi.fn(),
			create: vi.fn(),
			getCurrent: vi.fn(),
			update: vi.fn()
		}
	}
}));

// Provide URL.createObjectURL and URL.revokeObjectURL stubs for JSDOM
if (typeof URL.createObjectURL === "undefined") {
	URL.createObjectURL = vi.fn(() => "blob:dummy-object-url");
}

if (typeof URL.revokeObjectURL === "undefined") {
	URL.revokeObjectURL = vi.fn();
}

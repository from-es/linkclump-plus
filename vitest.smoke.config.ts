import { defineConfig } from "vitest/config";

/**
 * Vitest configuration for smoke tests only.
 * Runs tests in `tests/_vitest-check/` to verify the test environment.
 * Use: `npm run vitest:smoke`
 */
export default defineConfig({
	resolve: {
		conditions: [ "browser" ],
		tsconfigPaths: true
	},
	test: {
		globals: true,
		environment: "jsdom",
		include: [
			"tests/_vitest-check/**/*.test.{js,ts}"
		]
	}
});

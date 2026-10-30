import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
	resolve: {
		conditions: [ "browser" ],
		tsconfigPaths: true
	},
	test: {
		globals: true,
		environment: "jsdom",
		pool: "vmThreads",
		passWithNoTests: true,
		setupFiles: [
			"tests/shared/support/setup.ts"
		],
		include: [
			"src/**/*.test.{js,ts}",
			"tests/**/*.test.{js,ts}"
		],
		exclude: [
			...configDefaults.exclude,
			"tests/_vitest-check/**",
			"tests/page/**"
		],
		coverage: {
			provider: "v8",
			// Listing `include` makes never-imported files appear as 0% (the real picture),
			// and keeps the test infrastructure under tests/ out of the report.
			include: [ "src/**/*.{js,ts}" ],
			exclude: [
				// Third-party vendored code and non-code assets
				"src/assets/js/lib/colorpicker/**",
				"**/*.css",
				// Type declarations and type-only modules have no runtime code
				"**/*.d.ts",
				"src/assets/js/types/**",
				// WXT entry points / manifest definitions (declarative wiring, verified by build)
				"src/manifest.ts",
				"src/entrypoints/background/index.ts",
				"src/entrypoints/content/index.ts"
			]
		}
	}
});

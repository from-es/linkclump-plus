import { defineConfig } from "wxt";
import type { ConfigEnv, UserManifest, WxtViteConfig } from "wxt";
import { manifest } from "./src/manifest";


type GetViteConfig = (env: ConfigEnv) => WxtViteConfig;


type GetManifest = (env: ConfigEnv) => UserManifest;

/**
 * Generates the Vite configuration based on the environment.
 *
 * @param {ConfigEnv} env - The configuration environment provided by WXT.
 * @returns {WxtViteConfig} The generated Vite configuration.
 *
 * @see {@link https://wxt.dev/api/config.html#vite|Interface: InlineConfig, Vite - WXT}
 */
const getViteConfig: GetViteConfig = (env: ConfigEnv): WxtViteConfig => {
	const viteConfig: WxtViteConfig = {
		build: {
			// Add, Source Map
			sourcemap: env.mode === "sourcemap",

			/**
			 * Workaround for security and Isolated World behavior changes in
			 * Chrome v151.0.7912.0 (Dev) and later.
			 *
			 * Loading resources with the `crossorigin` attribute in popups or
			 * the options page can trigger errors such as:
			 *
			 * - "cross-world extension resource mismatch"
			 * - "not used within a few seconds"
			 *
			 * To avoid these issues, module preloading is disabled.
			 */
			modulePreload: false
		}
	};

	// console.debug("Debug, [wxt.config.ts] Generated Vite Config:", { env, viteConfig });

	return viteConfig;
};

/**
 * Generates the manifest based on the environment.
 *
 * @param {ConfigEnv} env - The configuration environment provided by WXT.
 * @returns {UserManifest} The generated manifest.
 *
 * @see {@link https://wxt.dev/api/config.html#manifest|Interface: InlineConfig, Manifest - WXT}
 */
const getManifest: GetManifest = (env: ConfigEnv): UserManifest => {
	const { browser } = env;
	const mf: UserManifest = structuredClone(manifest);  // Create a deep copy to avoid modifying the original manifest

	switch (browser) {
		case "chrome":
			delete mf.browser_specific_settings;
			break;
		case "firefox":
			delete mf.minimum_chrome_version;
			break;
		default:
			break;
	}

	// console.debug("Debug, [wxt.config.ts] Generated Manifest:", { env, manifest: JSON.stringify(mf, null, 2) });

	return mf;
};

/**
 * Defines the WXT configuration.
 *
 * @see {@link https://wxt.dev/api/config.html|Interface: InlineConfig - WXT}
 */
export default defineConfig({
	srcDir        : "src",
	publicDir     : "src/public",
	outDirTemplate: "{{browser}}-mv{{manifestVersion}}",

	vite    : getViteConfig,
	manifest: getManifest
});

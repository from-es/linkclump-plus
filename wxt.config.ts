import { defineConfig } from 'wxt';
import { type ConfigEnv, type WxtViteConfig } from 'wxt';

import manifest from './src/manifest.json' with { type: 'json' };



// Add, Source Map
const getViteConfig: (env: ConfigEnv) => WxtViteConfig | Promise<WxtViteConfig> = (env) => {
	// debug
	// console.log("Debug, wxt.config.ts >> getViteConfig(env) >> env >>", env);

	return {
		build: {
			sourcemap: ((env.mode === 'sourcemap') ? true : false)
		}
	};
};

// InlineConfig(https://wxt.dev/api/config.html)
export default defineConfig({
	srcDir        : "src",
	publicDir     : "src/public",
	outDirTemplate: "{{browser}}-mv{{manifestVersion}}",

	vite: getViteConfig,

	// Manifest(https://wxt.dev/guide/essentials/config/manifest#global-options)
	manifest: ({ browser, manifestVersion, mode, command }) => {
		// debug
		// console.log({ browser, manifestVersion, mode, command, manifest });

		return manifest;
	}
});
import { defineConfig, globalIgnores } from "eslint/config";

import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import stylistic from "@stylistic/eslint-plugin";



/**
 * Target files for linting
 */
const targetFiles = {
	javascript: [
		"**/*.js",
		"**/*.cjs",
		"**/*.mjs"
	],
	typescript: [
		"**/*.ts",
		"**/*.cts",
		"**/*.mts"
	]
};

/**
 * Maximum number of consecutive empty lines
 */
const MULTIPLE_EMPTY_LINES_MAX = 3;

/**
 * Common rules regarding line endings and line breaks
 *
 * @type {import('eslint').Linter.RulesRecord}
 */
const lineBreakRules = {
	// Require newline at end of files
	"@stylistic/eol-last": [ "error", "always" ],

	// Disallow empty lines at EOF (0), allow up to max (3) elsewhere
	"@stylistic/no-multiple-empty-lines": [
		"error", {
			"max": MULTIPLE_EMPTY_LINES_MAX,
			"maxEOF": 0
		}
	],

	// Enforce Unix linebreaks (LF)
	"@stylistic/linebreak-style": [ "error", "unix" ]
};

/**
 * Rules related to line breaks and empty lines
 *
 * @type {import('eslint').Linter.Config[]}
 */
const customRulesLineBreakRules = [
	{
		files: [
			...targetFiles.javascript,
			...targetFiles.typescript
		],
		plugins: {
			"@stylistic": stylistic,
		},
		rules: {
			...lineBreakRules
		}
	}
];

/**
 * Common Rules for js/mjs/ts files
 *
 * @type {import('eslint').Linter.Config[]}
 */
const customRules = [
	{
		files: [
			...targetFiles.javascript,
			...targetFiles.typescript
		],
		rules: {
			// variable declaration and assignment
			"no-unused-vars": "warn",
			"prefer-const": "warn",

			// stricter comparison operators
			"eqeqeq": "error",

			// code style
			"comma-style": [ "error", "last" ],
			"semi": [ "error", "always" ],

			// indent style
			"indent": [ "error", "tab", { "SwitchCase": 1 } ],

			// space
			"array-bracket-spacing": [ "error", "always" ],
			"block-spacing": [ "error", "always" ],
			"func-call-spacing": [ "error", "never" ],
			"no-trailing-spaces": "error",
			"space-before-blocks": [ "error", "always" ],
			"spaced-comment": [ "error", "always" ],

			// disables line length check
			"max-len": "off",

			// Enforce consistent brace style for all control statements
			"curly": "error",

			// Allow inline comments after code
			"no-inline-comments": "off"
		}
	}
];



export default defineConfig([
	// Ignore certain files and directories
	globalIgnores([
		".output/**",
		".wxt/**",
		"coverage/**",
		"material/**",
		"src/assets/js/lib/colorpicker/**",
		"tests/page/**"
	]),

	// Config for Global Variables
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.webextensions,
				chrome: "readonly"
			}
		}
	},

	// js.configs.recommended contains entries without 'files' specified,
	// so restrict to JS/TS files using extends + files (intersection) in defineConfig()
	{
		files: [
			...targetFiles.javascript,
			...targetFiles.typescript
		],
		extends: [ js.configs.recommended ]
	},

	// tseslint.configs.recommended also contains entries without 'files',
	// so restrict to TS files
	{
		files: [
			...targetFiles.typescript
		],
		extends: [ tseslint.configs.recommended ]
	},

	// Custom Rules
	...customRules,
	...customRulesLineBreakRules,

	// Override or add specific rules for TypeScript after recommended configs
	{
		files: [
			...targetFiles.typescript
		],
		rules: {
			"no-unused-vars": "off",                       // Disable core rule in TypeScript files in favor of @typescript-eslint/no-unused-vars
			"@typescript-eslint/no-unused-vars": "warn",   // Warn on unused variables
			"@typescript-eslint/no-explicit-any": "warn"   // Warn on explicit any usage
		}
	}
]);

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
 * Rules provided by ESLint core.
 *
 * Only rules related to code correctness and safety belong here.
 * Formatting and appearance rules belong in stylisticRules.
 *
 * @type {import('eslint').Linter.RulesRecord}
 */
const eslintCoreRules = {
	// variable declaration and assignment
	"no-unused-vars": "warn",
	"prefer-const": "warn",

	// stricter comparison operators
	"eqeqeq": "error",

	// console logging: allow semantic log levels only, prohibit console.log
	"no-console": [ "error", { "allow": [ "warn", "error", "info", "debug", "trace" ] } ],

	// Enforce consistent brace style for all control statements
	"curly": "error"
};

/**
 * Rules provided by @stylistic/eslint-plugin.
 *
 * Formatting and appearance rules belong here.
 * All rules in this object must use the "@stylistic/" prefix.
 *
 * @type {import('eslint').Linter.RulesRecord}
 */
const stylisticRules = {
	// line endings / blank lines
	"@stylistic/eol-last": [ "error", "always" ],

	// Disallow empty lines at EOF (0), allow up to max (3) elsewhere
	"@stylistic/no-multiple-empty-lines": [
		"error", {
			"max": MULTIPLE_EMPTY_LINES_MAX,
			"maxEOF": 0
		}
	],

	// Enforce Unix linebreaks (LF)
	"@stylistic/linebreak-style": [ "error", "unix" ],

	// Stylistic Issues
	"@stylistic/quotes": [ "error", "double", { "avoidEscape": true, "allowTemplateLiterals": "always" } ],

	// code style
	"@stylistic/comma-style": [ "error", "last" ],
	"@stylistic/semi": [ "error", "always" ],

	// indent style
	"@stylistic/indent": [ "error", "tab", { "SwitchCase": 1 } ],

	// space
	"@stylistic/array-bracket-spacing": [ "error", "always" ],
	"@stylistic/block-spacing": [ "error", "always" ],
	"@stylistic/function-call-spacing": [ "error", "never" ],
	"@stylistic/no-trailing-spaces": "error",
	"@stylistic/space-before-blocks": [ "error", "always" ],
	"@stylistic/spaced-comment": [ "error", "always" ],

	// disables line length check
	"@stylistic/max-len": "off",

	// Allow inline comments after code
	"@stylistic/no-inline-comments": "off"
};



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

	// Custom rules: ESLint core rules + @stylistic rules, clearly separated by source.
	{
		files: [
			...targetFiles.javascript,
			...targetFiles.typescript
		],
		plugins: {
			"@stylistic": stylistic
		},
		rules: {
			...eslintCoreRules,
			...stylisticRules
		}
	},

	// Override or add specific rules for TypeScript after recommended configs
	{
		files: [
			...targetFiles.typescript
		],
		rules: {
			"no-unused-vars": "off",                      // Disable core rule in TypeScript files in favor of @typescript-eslint/no-unused-vars
			"@typescript-eslint/no-unused-vars": "warn",  // Warn on unused variables
			"@typescript-eslint/no-explicit-any": "warn"  // Warn on explicit any usage
		}
	}
]);

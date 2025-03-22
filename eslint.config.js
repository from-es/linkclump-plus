import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


/** @type {import('eslint').Linter.Config[]} */
export default [
	{
		ignores: [
			"src/assets/js/lib/colorpicker/*"
		]
	},
	{
		files: [
			"**/*.{js,mjs,cjs,ts}"
		],
		rules: {
			// file
			"eol-last": ["error", "never"],
			"linebreak-style": ["error", "unix"],

			// variable declaration and assignment
			"no-unused-vars": "warn",
			"prefer-const": "warn",

			// stricter comparison operators
			"eqeqeq": "error",

			// code style
			"comma-style": ["error", "last"],
			"semi": ["error", "always"],

			// indent style
			"indent": ["error", "tab", { "SwitchCase": 1 }],

			// space
			"array-bracket-spacing": ["error", "always"],
			"block-spacing": ["error", "always"],
			"func-call-spacing": ["error", "never"],
			"no-trailing-spaces": "error",
			"space-before-blocks": ["error", "always"],
			"spaced-comment": ["error", "always"],

			// disables line length check
			"max-len": "off",

			// Enforce consistent brace style for all control statements
			"curly": "error",

			// Allow inline comments after code
			"no-inline-comments": "off"
		}
	},
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.webextensions,
				chrome: "readonly"
			}
		}
	},
	pluginJs.configs.recommended,
	...tseslint.configs.recommended
];
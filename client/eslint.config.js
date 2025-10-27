// eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";

export default [
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
    settings: {
      react: {
        version: "detect", // 👈 auto-detects from package.json
      },
    },
    rules: {
      ...js.configs.recommended.rules, // instead of "extends"
      'react/prop-types': 'off',
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs", // allow require()
    },
  },
  pluginReact.configs.flat.recommended,
];

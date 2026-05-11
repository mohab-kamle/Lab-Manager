// eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";

export default [
<<<<<<< HEAD
=======
  js.configs.recommended,
  pluginReact.configs.flat.recommended,
>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e
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
<<<<<<< HEAD
      ...js.configs.recommended.rules, // instead of "extends"
=======
>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e
      'react/prop-types': 'off',
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs", // allow require()
<<<<<<< HEAD
    },
  },
  pluginReact.configs.flat.recommended,
=======
      globals: {
        ...globals.node
      }
    },
  }
>>>>>>> 86bbcc2044522819d266fb427ab59b27ed7ef22e
];

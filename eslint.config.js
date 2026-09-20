import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  {
    files: ["app.js", "site.js", "src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        UM: "readonly",
        UMContract: "readonly",
        StrategyNetworkApi: "readonly",
        StrategyValidation: "readonly",
        module: "readonly",
      },
      parserOptions: { ecmaVersion: "latest" },
    },
    rules: {
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-vars": ["error", { args: "none", caughtErrors: "none" }],
    },
  },
];

import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["src/core/**/*.js", "tests/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { ...globals.node } },
  },
  {
    files: ["src/platform/**/*.js", "src/render/**/*.js", "src/games/**/*.js"],
    languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { ...globals.browser } },
  },
  { files: ["build.mjs"], languageOptions: { ecmaVersion: 2022, sourceType: "module", globals: { ...globals.node } } },
];

import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    languageOptions: {
      ecmaVersion: 3,
      sourceType: "script",
    },
    // languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
]);

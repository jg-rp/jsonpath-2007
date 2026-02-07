import js from "@eslint/js";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,cjs}"],
    plugins: { js },
    languageOptions: {
      ecmaVersion: 3,
      sourceType: "script"
    }
  }
]);

import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**", "apps/mobile/android/**", "apps/mobile/ios/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["tests/e2e/**/*.cjs"],
    languageOptions: { sourceType: "commonjs", globals: { require: "readonly", process: "readonly", window: "readonly", localStorage: "readonly" } },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  { files: ["tests/e2e/**/*.mjs"], languageOptions: { globals: { process: "readonly", window: "readonly", localStorage: "readonly" } } },
  {
    languageOptions: { globals: { window: "readonly", document: "readonly", console: "readonly", localStorage: "readonly" } },
    rules: { "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }] },
  },
);

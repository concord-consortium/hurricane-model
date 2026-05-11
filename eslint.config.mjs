import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

const noConsole = process.env.LINT_BUILD ? "error" : "off";
const noDebugger = process.env.LINT_BUILD ? "error" : "off";

export default tseslint.config(
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**", "cypress/**", "__mocks__/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactPlugin.configs.flat.recommended,
  {
    plugins: { "react-hooks": reactHooksPlugin },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      // Translated from tslint.json — preserves the project's existing leniency.
      "curly": ["error", "multi-line"],
      "max-len": ["error", { code: 120 }],
      "no-bitwise": "off",
      "no-console": noConsole,
      "no-debugger": noDebugger,
      "no-empty": ["error", { allowEmptyCatch: true }],
      "no-unused-expressions": ["error", { allowShortCircuit: true, allowTernary: true }],
      "max-classes-per-file": "off",
      // typescript-eslint defaults flag a lot of pre-existing patterns (any, ts-ignore, unused vars)
      // that TSLint never caught. Keep behavior unchanged on migration; tighten later if desired.
      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      // React rules — match the tslint-react settings that were disabled.
      "react/prop-types": "off",
      "react/display-name": "off",
      "react/no-unescaped-entities": "off",
      "react/jsx-key": "warn",
      "react/jsx-no-target-blank": "off",
      // react-hooks/exhaustive-deps is a useful warning, but several existing call sites
      // already silence it intentionally. Keep it as warn so it shows in editors.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-inner-declarations": "off",
    },
  }
);

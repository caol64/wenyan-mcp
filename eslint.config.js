import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default [
    {
        ignores: ["dist/**", "node_modules/**"],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.node,
                ...globals.nodeBuiltin,
            },
        },
        rules: {
            "no-unused-vars": "off",
            "no-console": "off",
            "no-debugger": "warn",
            "@typescript-eslint/no-explicit-any": "off", // Temporarily allow 'any' as it might be used in the project
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
        },
    },
    {
        files: ["**/*.test.ts", "**/*.test.js"],
        rules: {
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": "off",
        },
    },
];

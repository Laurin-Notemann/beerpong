// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const tseslint = require('typescript-eslint');

module.exports = defineConfig([
    expoConfig,
    tseslint.configs.recommended,
    {
        ignores: [
            'dist/*',
            'ios/*',
            'android/*',
            '.expo/*',
            'openapi/*',
            '**/*.test.ts',
            '**/*.test.tsx',
        ],
    },
    {
        rules: {
            'react-hooks/rules-of-hooks': 'error',
            'no-console': 'error',
            // Text renders quotes literally; this rule is about HTML entities.
            'react/no-unescaped-entities': 'off',
            eqeqeq: ['error', 'smart'],
            'no-restricted-imports': ['error', { patterns: ['./*', '../*'] }],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
            '@typescript-eslint/no-require-imports': 'off',
            // eslint-plugin-import can't resolve package "exports" subpaths; TypeScript checks these.
            'import/no-unresolved': [
                'error',
                { ignore: ['^@legendapp/list/', '^@expo/vector-icons/'] },
            ],
        },
    },
]);

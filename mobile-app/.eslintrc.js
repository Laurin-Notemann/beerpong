// https://docs.expo.dev/guides/using-eslint/
module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
    },
    ignorePatterns: ['*/**/*.test.ts', '*/**/*.test.tsx'],
    extends: ['expo', 'plugin:@typescript-eslint/recommended'],
    rules: {
        'react-hooks/rules-of-hooks': 'error',
        'no-console': 'error',
        eqeqeq: ['error', 'smart'],
        'no-restricted-imports': [
            'error',
            {
                patterns: ['./*', '../*'],
            },
        ],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
    },
};

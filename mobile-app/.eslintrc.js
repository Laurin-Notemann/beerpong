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
        // React Compiler rules arrived with eslint-config-expo 58 and flag existing patterns
        // (mostly reanimated shared values read during render). Warn until they're migrated.
        'react-hooks/refs': 'warn',
        'react-hooks/set-state-in-effect': 'warn',
        'react-hooks/purity': 'warn',
        'react-hooks/immutability': 'warn',
        'react-hooks/preserve-manual-memoization': 'warn',
    },
};

import eslintPluginNext from '@next/eslint-plugin-next'
import tsParser from '@typescript-eslint/parser'

const nextRecommended = eslintPluginNext.configs.recommended

export default [
  {
    ignores: ['node_modules/**', '.next/**', 'out/**', 'dist/**', 'build/**'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@next/next': eslintPluginNext,
    },
    rules: {
      ...nextRecommended.rules,
      'no-console': 'off',
    },
  },
]

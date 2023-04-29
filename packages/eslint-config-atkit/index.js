/** @type {import('eslint').Linter.Config} */
module.exports = {
  plugins: ['@typescript-eslint'],
  extends: [
    'turbo',
    'prettier',
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {},
  parser: '@typescript-eslint/parser',
}

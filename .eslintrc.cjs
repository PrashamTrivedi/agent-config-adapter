module.exports = {
  root: true,
  env: {
    worker: true,
    es2021: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'prettier',
  ],
  rules: {
    'import/order': [
      'error',
      {
        'groups': ['type', 'builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'alphabetize': { order: 'asc', caseInsensitive: true },
        'newlines-between': 'always'
      }
    ]
  },
  settings: {
    'import/resolver': {
      typescript: {}
    }
  }
};

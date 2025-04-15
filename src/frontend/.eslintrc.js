module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
      project: 'tsconfig.json',
      tsconfigRootDir: __dirname,
      sourceType: 'module',
      ecmaVersion: 2020,
      ecmaFeatures: {
        jsx: true,
      },
    },
    plugins: ['@typescript-eslint/eslint-plugin', 'react', 'react-hooks'],
    extends: [
      'plugin:@typescript-eslint/recommended',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
    ],
    root: true,
    env: {
      node: true,
      browser: true,
      es6: true,
    },
    ignorePatterns: ['.eslintrc.js', 'node_modules/', 'dist/', 'build/', 'vite.config.ts'],
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'caughtErrorsIgnorePattern': '^_'
      }],
      'no-console': 'warn',
      'prefer-const': 'warn',
      'no-var': 'error',
      'eqeqeq': ['error', 'always', {'null': 'ignore'}],
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  };
  
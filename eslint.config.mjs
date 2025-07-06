import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import a11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-plugin-prettier';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  // Global ignores
  {
    ignores: [
      'build/**',
      'dist/**',
      'node_modules/**',
      'public/**',
      '.react-router/**',
      '**/\\.well-known.*',
    ],
  },

  // Base JavaScript configuration
  {
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: {
        ...globals.es2024,
      },
    },
  },

  // TypeScript configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': ts,
    },
    rules: {
      ...ts.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
    },
  },

  // React configuration
  {
    files: ['**/*.jsx', '**/*.tsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      react,
      'react-hooks': hooks,
      import: importPlugin,
      'jsx-a11y': a11y,
      prettier,
      'unused-imports': unusedImports,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...hooks.configs.recommended.rules,
      ...a11y.configs.recommended.rules,

      // React specific rules
      'react/prop-types': 'off', // Using TypeScript instead
      'react/react-in-jsx-scope': 'off', // React 17+ JSX transform
      'react/jsx-uses-react': 'off', // React 17+ JSX transform
      'react/jsx-key': 'error',
      'react/no-array-index-key': 'warn',
      'react/no-danger': 'warn',
      'react/jsx-no-target-blank': 'error',

      // Global variables
      'no-undef': 'off', // Let TypeScript handle this

      // React Hooks rules
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Import rules
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-unresolved': 'off', // Turn off for now, let TypeScript handle it
      'import/no-duplicates': 'error',
      'import/no-unused-modules': 'warn', // Enable to catch unused imports

      // Unused imports detection
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // Accessibility rules
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',

      // Prettier integration
      'prettier/prettier': 'error',
    },
  },

  // React Router specific rules for route modules
  {
    files: ['app/routes/**/*.{ts,tsx}'],
    rules: {
      // Route module specific rules
      'prefer-const': 'error',
      'no-var': 'error',

      // Encourage proper loader/action patterns
      'import/no-default-export': 'off', // Route modules need default exports

      // Custom rules for route modules
      'no-console': 'off', // Allow console.log in route modules (server-side)

      // TypeScript specific for routes
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },

  // Server-side code
  {
    files: [
      'server/**/*.{ts,js}',
      'app/entry.server.tsx',
      'app/api/**/*.{ts,tsx}',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-console': 'off', // Allow console.log in server code
      '@typescript-eslint/no-var-requires': 'off', // Allow require() in server code
      'no-undef': 'off', // Let TypeScript handle this
    },
  },

  // Client-side code
  {
    files: [
      'app/entry.client.tsx',
      'app/routes/**/*.{ts,tsx}',
      'app/components/**/*.{ts,tsx}',
    ],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // Configuration files
  {
    files: ['*.config.{ts,js,mjs}', 'vite.config.{ts,js}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'import/no-default-export': 'off',
    },
  },
];

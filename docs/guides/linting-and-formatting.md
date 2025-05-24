# Linting and Formatting Guide

This guide explains the linting and formatting setup for the API Best Shot project.

## Technologies Used

- ESLint: For code linting with TypeScript support
- Prettier: For code formatting
- ESLint-Prettier Integration: To avoid conflicts between ESLint and Prettier
- Husky: For Git hooks management
- lint-staged: For running checks on staged files only

## Available Scripts

The following npm scripts are available for code quality checks:

```bash
# Check TypeScript types without emitting files
yarn compile

# Run ESLint on all TypeScript files
yarn lint

# Fix ESLint issues automatically
yarn lint:fix

# Format all supported files with Prettier
yarn format
```

## Configuration Files

### 1. ESLint Configuration (`.eslintrc`)

```json
{
  "root": true,
  "env": {
    "es2022": true,
    "node": true
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint", "prettier"],
  "rules": {
    "prettier/prettier": "error",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }
    ],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off"
  }
}
```

### 2. Prettier Configuration (`.prettierrc`)

```json
{
  "arrowParens": "avoid",
  "bracketSpacing": true,
  "htmlWhitespaceSensitivity": "css",
  "insertPragma": false,
  "jsxBracketSameLine": false,
  "jsxSingleQuote": false,
  "printWidth": 90,
  "proseWrap": "preserve",
  "requirePragma": false,
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "useTabs": false
}
```

### 3. Prettier Ignore (`.prettierignore`)

```
node_modules
dist
build
```

## Pre-commit Validation Process

Before each commit, the following checks are performed automatically in this order:

1. TypeScript Type Checking (`yarn compile`):

   - Runs on the entire project
   - Ensures there are no type errors
   - Blocks commit if any type errors are found

2. Staged Files Processing (via lint-staged):
   - For TypeScript files (_.ts, _.tsx):
     - ESLint fixes any fixable issues
     - Prettier formats the code
   - For JSON and Markdown files (_.json, _.md):
     - Prettier formats the files

If any of these checks fail, the commit will be blocked until you fix the issues.

## Best Practices

1. Keep your code clean by following the linting rules
2. Use the available scripts for specific tasks:
   - `yarn compile` to verify types
   - `yarn lint` to check for code style issues
   - `yarn lint:fix` to automatically fix common issues
   - `yarn format` to format all supported files
3. Keep `.prettierignore` updated with any new build output directories

## Dependencies

The following development dependencies are required:

```json
{
  "eslint": "^8.56.0",
  "@typescript-eslint/parser": "^6.21.0",
  "@typescript-eslint/eslint-plugin": "^6.21.0",
  "eslint-config-prettier": "^9.1.0",
  "eslint-plugin-prettier": "^5.1.3",
  "prettier": "^3.2.5",
  "husky": "^8.0.3",
  "lint-staged": "^15.2.0"
}
## Pre-commit Hooks

The project uses Husky and lint-staged to automatically check code quality before each commit. This ensures that no code with linting or formatting issues is committed to the repository.

### Setup

The pre-commit hooks are automatically installed when you run `yarn install` thanks to the `prepare` script in package.json.

## Best Practices

1. Keep your code clean by following the linting rules
2. Let the pre-commit hooks do their job - they'll catch any formatting issues
3. If needed, you can run checks manually:
   - `yarn type-check` to check TypeScript types
   - `yarn lint` to check for potential issues
   - `yarn lint:fix` to automatically fix common issues
   - `yarn format` to format all supported files
4. Keep `.prettierignore` updated with any new build output directories
```

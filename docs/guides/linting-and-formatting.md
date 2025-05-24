# Linting and Formatting Guide

This guide explains the linting and formatting setup for the API Best Shot project.

## Technologies Used

- ESLint: For code linting with TypeScript support
- Prettier: For code formatting
- ESLint-Prettier Integration: To avoid conflicts between ESLint and Prettier

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
    "no-unused-vars": "on",
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

## Available Scripts

The following npm scripts are available for linting and formatting:

```bash
# Check for linting issues
yarn lint

# Fix linting issues automatically
yarn lint:fix

# Format all TypeScript, JSON, and Markdown files
yarn format
```

## Dependencies

The following development dependencies are required:

```json
{
  "eslint": "^8.56.0",
  "@typescript-eslint/parser": "^6.21.0",
  "@typescript-eslint/eslint-plugin": "^6.21.0",
  "eslint-config-prettier": "^9.1.0",
  "eslint-plugin-prettier": "^5.1.3",
  "prettier": "^3.2.5"
}
```

## Key Features

1. **TypeScript Support**: Full TypeScript linting support with specific rules for type checking.
2. **Modern JavaScript**: ES2022 features support.
3. **Automatic Formatting**: Prettier integration ensures consistent code formatting.
4. **Intelligent Rules**:
   - Allows underscore-prefixed unused variables
   - Warns about `any` type usage
   - Flexible function return type annotations
   - Consistent code style enforcement

## Pre-commit Hooks

The project uses Husky and lint-staged to automatically check code quality before each commit. This ensures that no code with linting or formatting issues is committed to the repository.

### Setup

The pre-commit hooks are automatically installed when you run `yarn install` thanks to the `prepare` script in package.json.

### What Gets Checked

Before each commit, the following checks are performed automatically:

1. For TypeScript files (_.ts, _.tsx):

   - ESLint will check and fix issues
   - Prettier will format the code

2. For JSON and Markdown files (_.json, _.md):
   - Prettier will format the files

If any of these checks fail, the commit will be blocked until you fix the issues.

## Best Practices

1. Keep your code clean by following the linting rules
2. Let the pre-commit hooks do their job - they'll catch any formatting issues
3. If needed, you can run checks manually:
   - `yarn lint` to check for potential issues
   - `yarn lint:fix` to automatically fix common issues
   - `yarn format` to format all supported files
4. Keep `.prettierignore` updated with any new build output directories

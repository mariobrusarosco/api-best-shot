# IDE Setup Guide

## VSCode/Cursor Configuration for Auto-Cleanup on Save

### Method 1: Project-Level Settings (Recommended)

Create `.vscode/settings.json` in your project root:

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit",
    "source.removeUnused": "explicit"
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.removeUnusedImports": true
}
```

### Method 2: User-Level Settings

Open VSCode/Cursor Settings (Ctrl/Cmd + ,) and add:

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit", 
    "source.removeUnused": "explicit"
  },
  "typescript.preferences.removeUnusedImports": true
}
```

## Required Extensions

Install these extensions:

1. **ESLint** (`ms-vscode.vscode-eslint`)
2. **Prettier** (`esbenp.prettier-vscode`)
3. **TypeScript Importer** (`pmneo.tsimporter`) - Optional but helpful

## What This Does

When you save a file (Ctrl/Cmd + S):

- ✅ **Auto-fix ESLint issues** (including unused variables)
- ✅ **Remove unused imports**
- ✅ **Organize imports** (sort and group)
- ✅ **Format code** with Prettier
- ✅ **Remove unused variables** (via TypeScript)

## Keyboard Shortcuts

You can also trigger these manually:

- **Ctrl/Cmd + Shift + P** → "Organize Imports"
- **Ctrl/Cmd + Shift + P** → "Remove Unused Imports"
- **Ctrl/Cmd + Shift + P** → "Fix All ESLint Issues"

## Project-Specific Setup

To enforce this for all team members, create `.vscode/settings.json` and commit it to your repository.
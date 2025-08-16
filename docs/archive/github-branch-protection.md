# GitHub Branch Protection Setup Guide

## 🛡️ Overview

This guide explains how to set up branch protection rules on GitHub to prevent merging pull requests that fail CI/CD checks.

## 🎯 What We've Implemented

### Unified CI/CD Workflow (`ci.yml`)

- **Triggers**:
  - Pull requests to `main` (validation only)
  - Pushes to `main` (validation + deployment)
  - Manual dispatch (`workflow_dispatch`)
- **Quality Checks**:
  - Code linting (`yarn lint`)
  - TypeScript compilation (`yarn compile`)
  - Test execution (`yarn test --passWithNoTests`)
  - Build verification (`yarn build`)
- **Security Checks**:
  - Dependency audit (`yarn audit`)
- **Conditional Deployment**:
  - Only runs on main branch pushes
  - Requires all CI checks to pass first
  - Deploys to Google Cloud Run

## 🔧 Setting Up Branch Protection

### Step 1: Access Repository Settings

1. Go to your GitHub repository
2. Click on **Settings** tab
3. Navigate to **Branches** in the left sidebar

### Step 2: Add Branch Protection Rule

1. Click **Add rule**
2. Set **Branch name pattern**: `main`

### Step 3: Configure Protection Rules

#### Required Settings:

- ✅ **Require a pull request before merging**
- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - ✅ **Add required status checks**:
    - `Quality Checks` (from CI workflow)
    - `Security Checks` (from CI workflow)

#### Optional but Recommended:

- ✅ **Require conversation resolution before merging**
- ✅ **Restrict pushes that create files that modify content** (for sensitive files)
- ✅ **Do not allow bypassing the above settings** (prevents admins from bypassing)

### Step 4: Save Rules

Click **Create** to activate the branch protection.

## 🔍 How It Works

### Pull Request Workflow:

1. Developer creates PR to `main`
2. CI workflow automatically runs:
   - Linting checks code style
   - TypeScript compilation ensures type safety
   - Tests verify functionality (currently passes with no tests)
   - Build process validates the application can be built
3. All checks must pass before merge is allowed
4. Upon merge to `main`, deployment workflow triggers:
   - Runs same CI checks again (ensuring main branch integrity)
   - Only deploys if ALL checks pass
   - Fails fast if any check fails, preventing broken deployments

### Status Check Requirements:

- **Quality Checks**: Linting, type checking, tests, and build must pass
- **Security Checks**: Dependency audit must complete successfully
- **Up-to-date Branch**: PR branch must be current with `main`
- **Code Review**: At least one approval required
- **Conversation Resolution**: All PR comments must be resolved

## 🚨 Troubleshooting

### Common Issues:

#### CI Workflow Not Found

- **Problem**: Status checks show "Expected" but workflow doesn't run
- **Solution**: Ensure workflow files are in `main` branch in `.github/workflows/`

#### Status Check Names Don't Match

- **Problem**: Required status checks don't appear in PR
- **Solution**:
  1. Create a test PR to see actual status check names
  2. Update branch protection rule with exact names
  3. Status check names must match job names in workflow

#### Tests Failing with No Tests

- **Problem**: `yarn test` fails because no test files exist
- **Solution**: Already handled with `--passWithNoTests` flag in CI

## 📈 Next Steps

### Immediate Actions:

1. Set up branch protection rules following this guide
2. Test with a sample PR to verify protection works
3. Ensure all team members understand the new workflow

### Future Improvements:

1. **Add Test Coverage**: Implement actual tests for critical functionality
2. **Code Quality Gates**: Add coverage thresholds and quality metrics
3. **Security Scanning**: Integrate SAST/DAST tools
4. **Performance Testing**: Add performance regression checks
5. **CODEOWNERS File**: Define code ownership for critical files

## 🔗 Related Documentation

- [CI/CD Workflow Documentation](./ci-cd-workflows.md)
- [Testing Strategy Guide](./testing-strategy.md)
- [Code Review Guidelines](./code-review-guidelines.md)

---

## ✅ Verification Checklist

After setup, verify your protection is working:

- [ ] Create a test PR with a linting error → Should block merge
- [ ] Create a test PR with TypeScript error → Should block merge
- [ ] Create a test PR with build failure → Should block merge
- [ ] Create a clean PR → Should allow merge after approval
- [ ] Verify deployment triggers only after merge to main

**Your branch protection is now active! 🛡️**

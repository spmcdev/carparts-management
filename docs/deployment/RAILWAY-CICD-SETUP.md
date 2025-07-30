# Railway CI/CD Setup Guide

## Overview
This guide shows how to set up a staging → production CI/CD pipeline with Railway.

## Architecture
```
GitHub Repository
├── develop branch → Railway Staging Environment
└── main branch    → Railway Production Environment
```

## Setup Steps

### 1. Create Railway Projects

Create separate Railway projects for each environment:

**Option A: Separate Projects (Recommended)**
- `carparts-staging` - for testing changes
- `carparts-production` - for live application

**Option B: Multiple Environments in Same Project**
- Single project with staging and production environments

### 2. Connect GitHub Repository

For each Railway project:
1. Connect your GitHub repository
2. Set branch-specific deployments:
   - Staging: `develop` branch
   - Production: `main` branch

### 3. Environment Variables

**Staging Environment:**
```bash
NODE_ENV=staging
REACT_APP_API_URL=https://carparts-staging-api.up.railway.app
JWT_SECRET=staging-secret-here
FRONTEND_URL=https://carparts-staging.up.railway.app
```

**Production Environment:**
```bash
NODE_ENV=production
REACT_APP_API_URL=https://carparts-api.up.railway.app
JWT_SECRET=production-secret-here
FRONTEND_URL=https://carparts.up.railway.app
```

### 4. Database Setup

**For each environment, create separate databases:**
- Staging database: `carparts_staging`
- Production database: `carparts_production`

### 5. Deployment Workflow

#### Manual Workflow (Simple)
1. **Develop**: Make changes on feature branches
2. **Test**: Merge to `develop` → auto-deploys to staging
3. **Validate**: Test changes in staging environment
4. **Deploy**: Merge to `main` → auto-deploys to production

#### Automated Workflow (Advanced)
Use the provided GitHub Actions workflow:
1. All pushes trigger tests
2. `develop` branch → deploys to staging
3. `main` branch → deploys to production (with approval)

## Railway CLI Commands

### Deploy to specific environment:
```bash
# Deploy to staging
railway login
railway link carparts-staging
railway up

# Deploy to production
railway link carparts-production
railway up
```

### Check deployment status:
```bash
railway status
railway logs
```

## Branch Strategy

### Recommended Git Flow:
```
feature/new-feature → develop → main
                       ↓         ↓
                   staging   production
```

### Workflow:
1. Create feature branch from `develop`
2. Make changes and test locally
3. Push feature branch and create PR to `develop`
4. Merge to `develop` → triggers staging deployment
5. Test in staging environment
6. Create PR from `develop` to `main`
7. Merge to `main` → triggers production deployment

## Benefits of This Setup

✅ **Isolation**: Separate databases and environments
✅ **Testing**: Validate all changes in staging first
✅ **Rollback**: Easy to revert production if issues arise
✅ **Monitoring**: Separate logs and metrics per environment
✅ **Security**: Different secrets for each environment

## Migration from Current Setup

### Step 1: Create Staging Environment
```bash
# Create new Railway project for staging
railway new carparts-staging
cd frontend
railway up  # Deploy current frontend to staging
```

### Step 2: Set Up Branch Protection
1. Create `develop` branch from `main`
2. Set up branch protection rules
3. Require PR reviews for `main` branch

### Step 3: Update CI/CD
1. Add the provided GitHub Actions workflow
2. Set up Railway tokens as GitHub secrets
3. Configure environment-specific variables

### Step 4: Test the Pipeline
1. Make a small change
2. Push to `develop` branch
3. Verify staging deployment
4. Merge to `main`
5. Verify production deployment

## Railway Tokens for CI/CD

Create tokens for automated deployments:
```bash
# Get staging project token
railway login
railway link carparts-staging
railway token

# Get production project token
railway link carparts-production
railway token
```

Add these to GitHub secrets:
- `RAILWAY_STAGING_TOKEN`
- `RAILWAY_PRODUCTION_TOKEN`

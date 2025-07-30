# Manual Railway CI/CD Setup Guide

## Step-by-Step Manual Setup (Recommended)

Since Railway CLI requires interactive setup, here's the manual approach:

### 1. Create Staging Environment

```bash
# Login to Railway
railway login

# Create staging project
railway new
# When prompted, name it: carparts-staging

# Link current directory to staging project
railway link

# Set staging environment variables
railway variables set NODE_ENV=staging
railway variables set REACT_APP_API_URL=https://carparts-staging-api.up.railway.app
railway variables set FRONTEND_URL=https://carparts-staging.up.railway.app
railway variables set JWT_SECRET=your-staging-jwt-secret-here

# Deploy backend to staging
railway up

# Deploy frontend to staging
cd frontend
railway up
cd ..
```

### 2. Create Production Environment

```bash
# Create production project
railway new
# When prompted, name it: carparts-production

# Link current directory to production project
railway link

# Set production environment variables
railway variables set NODE_ENV=production
railway variables set REACT_APP_API_URL=https://carparts-api.up.railway.app
railway variables set FRONTEND_URL=https://carparts.up.railway.app
railway variables set JWT_SECRET=your-production-jwt-secret-here

# Deploy backend to production
railway up

# Deploy frontend to production
cd frontend
railway up
cd ..
```

### 3. Get Railway Tokens for CI/CD

```bash
# For staging project
railway link carparts-staging
railway token
# Copy this token for GitHub secret: RAILWAY_STAGING_TOKEN

# For production project
railway link carparts-production
railway token
# Copy this token for GitHub secret: RAILWAY_PRODUCTION_TOKEN
```

### 4. Set Up GitHub Repository

```bash
# Create develop branch
git checkout -b develop
git push -u origin develop

# Add GitHub secrets in repository settings:
# - RAILWAY_STAGING_TOKEN (from step 3)
# - RAILWAY_PRODUCTION_TOKEN (from step 3)
```

### 5. Set Up Branch Protection (GitHub)

1. Go to GitHub repository → Settings → Branches
2. Add protection rule for `main` branch:
   - Require pull request reviews
   - Require status checks to pass
   - Include administrators

### 6. Test the Pipeline

```bash
# Make a test change
echo "# Test change" >> README.md
git add .
git commit -m "test: pipeline verification"

# Push to develop (should deploy to staging)
git push origin develop

# Create PR to main (should deploy to production after merge)
gh pr create --base main --head develop --title "Test deployment pipeline"
```

## Alternative: Railway Dashboard Setup

If you prefer using the web interface:

1. **Go to [Railway Dashboard](https://railway.app/dashboard)**
2. **Create New Project** → carparts-staging
3. **Connect GitHub Repository**
4. **Set Environment Variables** (as listed above)
5. **Deploy Services**
6. **Repeat for Production** → carparts-production

## Linking Existing Projects

If you already have Railway projects:

```bash
# List your projects
railway projects

# Link to specific project
railway link [project-id-or-name]

# Check current project
railway status
```

## Environment Variable Management

```bash
# View current variables
railway variables

# Set a variable
railway variables set KEY=value

# Delete a variable
railway variables delete KEY
```

## Deployment Commands

```bash
# Deploy current directory
railway up

# Deploy with specific service name
railway up --service backend

# Deploy in detached mode
railway up --detach

# Check deployment logs
railway logs
```

## Troubleshooting

### Common Issues:

1. **"Not linked to project"**
   ```bash
   railway link
   ```

2. **"Authentication required"**
   ```bash
   railway login
   ```

3. **"Service not found"**
   ```bash
   railway status  # Check current project
   railway services  # List available services
   ```

### Useful Commands:

```bash
# Check project status
railway status

# View project in browser
railway open

# View logs
railway logs --follow

# Check project info
railway info
```

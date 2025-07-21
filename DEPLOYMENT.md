# Deployment Guide: Vercel + Railway

This guide will help you deploy your Car Parts Management System using Vercel (frontend) and Railway (backend + database).

## Prerequisites
- Git repository (GitHub, GitLab, or Bitbucket)
- Vercel account (free at vercel.com)
- Railway account (free at railway.app)

## Part 1: Deploy Backend to Railway

### Step 1: Create Railway Account and Project
1. Go to [railway.app](https://railway.app) and sign up with your GitHub account
2. Click "New Project"
3. Choose "Deploy from GitHub repo"
4. Select your repository and the root directory (where your main package.json is)

### Step 2: Configure Environment Variables in Railway
In your Railway project dashboard, go to **Variables** tab and add:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters
DB_HOST=postgres
DB_PORT=5432
DB_NAME=railway
DB_USER=postgres
DB_PASSWORD=<railway-will-auto-generate-this>
FRONTEND_URL=https://your-app-name.vercel.app
```

### Step 3: Add PostgreSQL Database
1. In your Railway project, click "+ New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically create the database and populate DB_* environment variables
4. Copy the connection details for later use

### Step 4: Deploy Backend
1. Railway will automatically deploy your backend from the root directory
2. Wait for deployment to complete
3. Note your backend URL: `https://your-project.up.railway.app`

### Step 5: Run Database Migrations
1. In Railway dashboard, go to your backend service
2. Click "Settings" → "Raw Service Settings"
3. Add this to the deploy command: `node index.js`
4. You may need to run migrations manually through Railway's built-in terminal

## Part 2: Deploy Frontend to Vercel

### Step 1: Create Vercel Account and Project
1. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account
2. Click "New Project"
3. Select your repository
4. Choose the `frontend` directory as the root directory

### Step 2: Configure Build Settings in Vercel
- **Framework Preset**: Create React App
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `build`

### Step 3: Configure Environment Variables in Vercel
In your Vercel project settings → Environment Variables, add:

```env
REACT_APP_API_URL=https://your-project.up.railway.app
```

### Step 4: Deploy Frontend
1. Click "Deploy"
2. Vercel will build and deploy your frontend
3. Your app will be available at: `https://your-app-name.vercel.app`

## Part 3: Update CORS Settings

### Update Backend CORS Configuration
After deployment, update your backend's CORS settings to include your Vercel domain:

In your Railway backend environment variables, update:
```env
FRONTEND_URL=https://your-app-name.vercel.app
```

## Part 4: SSL and Custom Domain (Optional)

### Vercel (Frontend)
- Automatic SSL is provided
- To add custom domain: Project Settings → Domains → Add Domain

### Railway (Backend)  
- Automatic SSL is provided
- Custom domain available in paid plans

## Part 5: Database Setup and Initial Data

### Option 1: Using Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Connect to your project
railway link

# Run database migrations
railway run npm run migrate
```

### Option 2: Manual Database Setup
1. Connect to your PostgreSQL database using the connection string from Railway
2. Run all your SQL migration files in order:
   - 01-init.sql
   - 02-users.sql
   - 03-update-parts.sql
   - etc.

## Testing Your Deployment

1. Visit your Vercel frontend URL
2. Try to register a new user
3. Login and test all functionality
4. Check Railway logs for any backend errors

## Monitoring and Logs

### Railway (Backend)
- View logs: Railway Dashboard → Your Service → Logs tab
- Monitor metrics: Railway Dashboard → Your Service → Metrics tab

### Vercel (Frontend)
- View deployment logs: Vercel Dashboard → Your Project → Functions tab
- Monitor analytics: Vercel Dashboard → Your Project → Analytics tab

## Cost Estimates

### Railway (Free Plan)
- $0/month for hobby projects
- Includes 500 hours of usage
- 1GB memory, 1 vCPU
- 1GB storage

### Vercel (Free Plan)
- $0/month for personal projects
- 100GB bandwidth
- Unlimited static sites
- Serverless functions included

## Troubleshooting

### Common Issues:
1. **CORS errors**: Ensure FRONTEND_URL is correctly set in Railway
2. **API connection failed**: Check REACT_APP_API_URL in Vercel
3. **Database connection issues**: Verify DB environment variables in Railway
4. **Build failures**: Check build logs in respective platforms

### Getting Help:
- Railway: [docs.railway.app](https://docs.railway.app)
- Vercel: [vercel.com/docs](https://vercel.com/docs)
- Community support available on both platforms

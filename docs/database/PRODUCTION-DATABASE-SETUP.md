# Production Database Setup Guide

This guide will help you set up the production database for the carparts management system.

## 🚀 Quick Start

### Step 1: Create Production PostgreSQL Database

**Option A: Railway (Recommended)**
1. Go to [Railway](https://railway.app)
2. Create a new project or use existing production project
3. Add PostgreSQL service
4. Note down the connection details

**Option B: Other PostgreSQL Providers**
- AWS RDS
- Google Cloud SQL
- DigitalOcean Managed Databases
- Supabase
- Neon

### Step 2: Run Database Setup Script

1. **Copy the setup script:**
   ```bash
   # Copy the production setup script
   cat database/setup/setup-production-database.sql
   ```

2. **Execute in your PostgreSQL console:**
   - **Railway**: Use the Railway console or connect via URL
   - **Other providers**: Use their web console or connect via psql

### Step 3: Configure Environment Variables

Update your production environment variables:

```env
# Database Configuration (Railway auto-provides DATABASE_URL)
DATABASE_URL=postgresql://username:password@host:port/database_name

# Application Configuration
NODE_ENV=production
PORT=3001
JWT_SECRET=your-super-secure-production-jwt-secret-here
JWT_EXPIRES_IN=24h

# Frontend Configuration
REACT_APP_API_URL=https://your-production-api.up.railway.app
FRONTEND_URL=https://your-production-frontend.up.railway.app
```

## 🔐 Security Checklist

### 1. Change Default Admin Password

The setup script creates an admin user with password `admin123`. **Change this immediately:**

```sql
-- Generate new password hash (use Node.js bcrypt)
-- const bcrypt = require('bcrypt');
-- const hash = bcrypt.hashSync('your-new-secure-password', 10);

UPDATE users 
SET password = '$2b$10$newHashHere' 
WHERE username = 'admin';
```

### 2. Set Strong JWT Secret

```bash
# Generate a strong JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Database Connection Security

- ✅ Use SSL connections in production
- ✅ Restrict database access to your application IPs
- ✅ Use environment variables for credentials
- ✅ Enable database backups

## 📊 Database Schema Overview

The production database includes:

### Core Tables:
- **users** - User management with roles
- **parts** - Parts inventory with quantity tracking
- **bills** - Sales transactions
- **bill_items** - Individual items in each bill

### Advanced Features:
- **bill_refunds** - Refund tracking
- **bill_refund_items** - Detailed refund items
- **reservations** - Customer reservations
- **reservation_items** - Reserved items
- **stock_movements** - Complete stock movement history
- **audit_log** - System audit trail

### Performance:
- ✅ Indexes on frequently queried columns
- ✅ Foreign key constraints for data integrity
- ✅ Check constraints for data validation
- ✅ Generated columns for calculated values

## 🚀 Railway Production Setup

### 1. Railway Project Setup

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Create production project
railway new carparts-production

# Add PostgreSQL service
# (Do this in Railway dashboard)
```

### 2. Deploy to Production

```bash
# Link to production project
railway link carparts-production

# Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=your-production-jwt-secret
railway variables set REACT_APP_API_URL=https://carparts-api.up.railway.app
railway variables set FRONTEND_URL=https://carparts.up.railway.app

# Deploy backend
railway up --detach

# Deploy frontend
cd frontend
railway up --detach
```

### 3. Database Setup

1. Go to Railway dashboard
2. Open PostgreSQL service
3. Click "Connect" → "PostgreSQL Console"
4. Copy and paste the contents of `setup-production-database.sql`
5. Execute the script

## 🔍 Verification

After setup, verify everything is working:

### 1. Check Database Tables

```sql
-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### 2. Test API Connection

```bash
# Test production API
curl https://your-production-api.up.railway.app/debug

# Test authentication
curl -X POST https://your-production-api.up.railway.app/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your-new-password"}'
```

### 3. Test Frontend

Visit your production frontend URL and verify:
- ✅ Login works
- ✅ Parts management loads
- ✅ Sales functionality works
- ✅ Refund system operates correctly

## 📋 Post-Setup Tasks

### 1. Data Migration (if needed)

If migrating from staging or another database:

```bash
# Export staging data
pg_dump $STAGING_DATABASE_URL > staging_data.sql

# Import to production (be careful!)
psql $PRODUCTION_DATABASE_URL < staging_data.sql
```

### 2. Monitoring Setup

- ✅ Set up database monitoring
- ✅ Configure application logging
- ✅ Set up error tracking (Sentry, etc.)
- ✅ Monitor API performance

### 3. Backup Strategy

- ✅ Enable automatic database backups
- ✅ Test backup restoration
- ✅ Document backup/restore procedures

## 🆘 Troubleshooting

### Common Issues:

1. **Connection Refused**
   - Check DATABASE_URL format
   - Verify SSL settings
   - Check firewall/IP restrictions

2. **Permission Denied**
   - Verify database user permissions
   - Check table ownership

3. **Migration Errors**
   - Check for existing tables
   - Verify foreign key constraints
   - Review error logs

### Getting Help:

1. Check application logs
2. Review database logs
3. Test with staging environment first
4. Verify environment variables

## 🎯 Production Checklist

- [ ] PostgreSQL database created
- [ ] Setup script executed successfully
- [ ] Admin password changed
- [ ] Environment variables configured
- [ ] Application deployed
- [ ] Database connection tested
- [ ] Authentication working
- [ ] Core functionality verified
- [ ] Backups configured
- [ ] Monitoring set up

---

**🎉 Your production database is ready!**

The carparts management system is now ready for production use with:
- ✅ Complete schema with all features
- ✅ Proper security configurations
- ✅ Performance optimizations
- ✅ Audit trails and tracking
- ✅ Multi-refund support (fixed!)

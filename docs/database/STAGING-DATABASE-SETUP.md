# Railway Staging Database Setup Guide

## Quick Setup (Recommended)

### 1. **Add PostgreSQL to Staging Project**
```bash
# Make sure you're linked to staging project
railway status

# If not linked to staging, link it
railway link carparts-staging

# Add PostgreSQL service through Railway dashboard:
# 1. Go to railway.app/dashboard
# 2. Open your carparts-staging project
# 3. Click "New Service" → "Database" → "PostgreSQL"
# 4. Railway will create the database and provide connection details
```

### 2. **Run Automated Setup**
```bash
# From your project root directory
./scripts/database/setup-staging-db.sh
```

## Manual Setup

### 1. **Connect to Staging Database**
```bash
# Link to staging project
railway link carparts-staging

# Connect to PostgreSQL
railway connect postgres
```

### 2. **Run Database Scripts**
```sql
-- In the PostgreSQL console, run:
\i database/setup/setup-database.sql
\i database/migrations/archive/18-enhance-reservation-system.sql
```

### 3. **Add Staging Test Data** (Optional)
```sql
-- Run the staging-specific setup:
\i database/setup/setup-staging-database.sql
```

## Environment Variables

Railway automatically provides these variables:
- `DATABASE_URL` - Full PostgreSQL connection string
- `PGHOST` - PostgreSQL host
- `PGPORT` - PostgreSQL port  
- `PGDATABASE` - Database name
- `PGUSER` - Database user
- `PGPASSWORD` - Database password

## Verify Setup

### 1. **Check Tables Created**
```bash
railway connect postgres -c "\dt"
```

### 2. **Verify Data**
```bash
railway connect postgres -c "SELECT COUNT(*) as users FROM users;"
railway connect postgres -c "SELECT COUNT(*) as parts FROM parts;"
```

### 3. **Test Connection from Backend**
```bash
# Set staging environment variables and test
export DATABASE_URL="your-railway-postgres-url"
npm test
```

## Database Schema

Your staging database will include:

### Core Tables:
- **users** - Authentication and roles
- **parts** - Inventory management
- **bills** - Sales transactions
- **audit_log** - Activity tracking

### Enhanced Features:
- **reservations** - Multi-item reservations
- **reservation_items** - Individual reserved items

### Default Accounts:
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: `superadmin`

## Environment-Specific Settings

### Staging vs Production:
```bash
# Staging Database
DATABASE_URL=postgresql://user:pass@staging-host:5432/carparts_staging

# Production Database  
DATABASE_URL=postgresql://user:pass@prod-host:5432/carparts_production
```

## Troubleshooting

### Connection Issues:
```bash
# Check Railway project status
railway status

# Check database service logs
railway logs --service postgresql

# Test connection
railway connect postgres -c "SELECT version();"
```

### Permission Issues:
```bash
# Railway manages permissions automatically
# If you have issues, check Railway dashboard for service status
```

## Data Migration

### From Production to Staging:
```bash
# Export production data (be careful!)
railway link carparts-production
railway connect postgres -c "\copy parts TO 'parts.csv' DELIMITER ',' CSV HEADER;"

# Import to staging
railway link carparts-staging  
railway connect postgres -c "\copy parts FROM 'parts.csv' DELIMITER ',' CSV HEADER;"
```

### Staging Data Reset:
```bash
# Clear staging data and start fresh
railway connect postgres -c "TRUNCATE parts, bills, reservations CASCADE;"
./scripts/database/setup-staging-db.sh
```

# Scripts Directory

This directory contains utility scripts organized by purpose for the Car Parts Management System.

## 📁 **Directory Structure**

```
scripts/
├── README.md                      # This file
├── deployment/                    # 🚀 Deployment automation
│   ├── deploy-prep.sh            # Deployment preparation for Vercel + Railway
│   └── setup-railway-cicd.sh     # Railway CI/CD environment setup
├── database/                      # 🗄️ Database operations
│   ├── setup-staging-db.sh       # Staging database initialization
│   └── run-staging-migration.sh  # Run consolidated database migration
├── monitoring/                    # 📊 Health checks and monitoring
│   └── production-health-check.js # Production API health validation
└── archive/                       # 📦 Legacy scripts
    ├── migrate-railway.sh         # Legacy Railway migration
    └── migrate-railway-cli.sh     # Legacy Railway CLI migration
```

## 🚀 **Deployment Scripts**

### **`deployment/deploy-prep.sh`**
- **Purpose**: Prepares project for Vercel + Railway deployment
- **Usage**: `./scripts/deployment/deploy-prep.sh`
- **Features**: 
  - Validates project structure
  - Builds frontend for production
  - Checks environment configuration
  - Prepares deployment files

### **`deployment/setup-railway-cicd.sh`**
- **Purpose**: Sets up Railway CI/CD environments (staging/production)
- **Usage**: `./scripts/deployment/setup-railway-cicd.sh`
- **Features**:
  - Creates Railway projects
  - Configures environment variables
  - Sets up database connections
  - Configures GitHub integration

## 🗄️ **Database Scripts**

### **`database/setup-staging-db.sh`**
- **Purpose**: Initializes staging database with complete schema
- **Usage**: `./scripts/database/setup-staging-db.sh`
- **Features**:
  - Creates all required tables
  - Sets up relationships and indexes
  - Inserts test data
  - Validates schema

### **`database/run-staging-migration.sh`**
- **Purpose**: Runs consolidated migration on staging database
- **Usage**: `./scripts/database/run-staging-migration.sh`
- **Features**:
  - Executes consolidated migration file
  - Handles schema rebuilds
  - Provides migration status

## 📊 **Monitoring Scripts**

### **`monitoring/production-health-check.js`**
- **Purpose**: Validates production API health and functionality
- **Usage**: `npm run test:production` or `node scripts/monitoring/production-health-check.js`
- **Features**:
  - Tests API connectivity
  - Validates endpoint responses
  - Checks authentication flows
  - Reports system health

## 📦 **Archived Scripts**

### **`archive/migrate-railway.sh`** & **`archive/migrate-railway-cli.sh`**
- **Purpose**: Legacy Railway migration scripts
- **Status**: Archived - replaced by consolidated migration approach
- **Note**: Preserved for historical reference

## 🛠️ **Usage Examples**

### **Quick Deployment**
```bash
# Prepare for deployment
./scripts/deployment/deploy-prep.sh

# Set up Railway environments
./scripts/deployment/setup-railway-cicd.sh
```

### **Database Management**
```bash
# Set up staging database
./scripts/database/setup-staging-db.sh

# Run migration
./scripts/database/run-staging-migration.sh
```

### **Health Monitoring**
```bash
# Check production health
npm run test:production

# Direct script execution
node scripts/monitoring/production-health-check.js
```

## ⚡ **Quick Reference**

| Task | Script | Location |
|------|--------|----------|
| **Deploy to Production** | `deploy-prep.sh` | [`deployment/`](deployment/) |
| **Setup Railway CI/CD** | `setup-railway-cicd.sh` | [`deployment/`](deployment/) |
| **Initialize Staging DB** | `setup-staging-db.sh` | [`database/`](database/) |
| **Run Migration** | `run-staging-migration.sh` | [`database/`](database/) |
| **Health Check** | `production-health-check.js` | [`monitoring/`](monitoring/) |

## 🔧 **Script Requirements**

### **Prerequisites**
- **Railway CLI**: Required for deployment and database scripts
- **Node.js 16+**: Required for monitoring scripts
- **PostgreSQL access**: Required for database scripts
- **Git**: Required for deployment scripts

### **Environment Variables**
Most scripts require proper environment configuration. See individual script documentation for specific requirements.

## 📝 **Adding New Scripts**

When adding new scripts:
1. **Choose appropriate directory** based on script purpose
2. **Follow naming convention**: `verb-noun.sh` or `purpose-description.js`
3. **Include header comment** with purpose and usage
4. **Update this README** with script documentation
5. **Set executable permissions**: `chmod +x script-name.sh`

## 🔗 **Related Documentation**

- [Deployment Guide](../docs/deployment/DEPLOYMENT.md)
- [Railway CI/CD Setup](../docs/deployment/RAILWAY-CICD-SETUP.md)
- [Database Setup](../docs/database/STAGING-DATABASE-SETUP.md)
- [Testing Documentation](../docs/testing/TESTING.md)

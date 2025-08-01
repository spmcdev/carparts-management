# Database Migration Safety Guide

## 🛡️ Protection Against Accidental Production Database Activities

### Overview
This guide outlines comprehensive strategies to prevent accidental database migrations or activities on your Railway production environment.

## 🚨 Critical Safety Rules

### 1. **NEVER run database commands directly on production without following the safety protocol**

### 2. **Always test on staging first**

### 3. **Use the protected scripts provided**

## 🔧 Safety Tools Implemented

### 1. Protected Production Migration Script
**File:** `scripts/database/run-production-migration.sh`

**Features:**
- Requires 3 separate confirmations
- Verifies Railway environment
- Shows migration content preview
- 10-second final countdown
- Logs all migration attempts
- Validates migration file exists

**Usage:**
```bash
# Check environment first
./scripts/database/check-railway-environment.sh

# Run protected migration
./scripts/database/run-production-migration.sh 19-add-user-active-status.sql
```

### 2. Environment Verification Script
**File:** `scripts/database/check-railway-environment.sh`

**Features:**
- Shows current Railway connection
- Warns when connected to production
- Provides safety checklists
- Lists available projects
- Shows switch commands

**Usage:**
```bash
# Always run this before any database operations
./scripts/database/check-railway-environment.sh
```

### 3. Enhanced CI/CD Protection
**File:** `.github/workflows/railway-deploy.yml`

**Protections:**
- Manual approval required for production
- Protected environment configuration
- Pre-deployment validation
- Safety check announcements
- Separate tokens for staging/production

## 📋 Production Migration Checklist

### Before Migration:
- [ ] 1. Test migration on staging environment
- [ ] 2. Verify staging works correctly after migration
- [ ] 3. Create/verify recent database backup
- [ ] 4. Review migration SQL for potential issues
- [ ] 5. Notify team of planned maintenance
- [ ] 6. Check current Railway environment connection

### During Migration:
- [ ] 1. Use protected migration script
- [ ] 2. Follow all prompts and confirmations
- [ ] 3. Monitor for errors during execution
- [ ] 4. Verify migration completes successfully

### After Migration:
- [ ] 1. Test critical application functionality
- [ ] 2. Verify API endpoints work correctly
- [ ] 3. Check database integrity
- [ ] 4. Monitor application logs for errors
- [ ] 5. Notify team of completion

## 🔒 Railway Environment Management

### Safe Environment Switching:
```bash
# Connect to staging (safe for testing)
railway link -p carparts-staging

# Connect to production (requires extreme caution)
railway link -p carparts-production
```

### Environment Verification:
```bash
# Always verify before database operations
railway status

# Or use our safety script
./scripts/database/check-railway-environment.sh
```

## 🚫 What NOT To Do

### ❌ NEVER:
- Run `railway connect Postgres` directly on production without safeguards
- Execute untested migrations on production
- Perform database operations without verification
- Skip the staging testing phase
- Ignore the environment verification warnings

## ✅ Recommended Workflow

### For Database Changes:
1. **Development**: Create and test migration locally
2. **Staging**: Apply migration to staging using safe scripts
3. **Testing**: Thoroughly test staging environment
4. **Production**: Use protected production migration script
5. **Verification**: Confirm production works correctly

### For Database Queries:
1. **Read-only**: Use staging for data analysis
2. **Development**: Test queries on local/staging first
3. **Production**: Only when absolutely necessary with proper safeguards

## 🔧 Additional Safety Measures

### 1. Backup Strategy
- Railway automatically creates backups
- Verify backup availability before major changes
- Consider manual backup for critical migrations

### 2. Monitoring
- Monitor application logs after migrations
- Set up alerts for database errors
- Track migration execution logs

### 3. Team Communication
- Use protected environments in GitHub
- Require PR approvals for production changes
- Document all production database changes

## 📞 Emergency Procedures

### If Accidental Migration Occurs:
1. **Stop immediately** if migration is still running
2. **Assess damage** by checking database state
3. **Restore from backup** if necessary
4. **Contact team** for assistance
5. **Document incident** for future prevention

### Recovery Commands:
```bash
# Check Railway environment
railway status

# View recent backups (if available)
railway logs --service Postgres

# Connect to staging to verify expected state
railway link -p carparts-staging
railway connect Postgres
```

## 📝 Migration Log

All production migrations are logged to:
`scripts/database/production-migrations.log`

This file tracks:
- Timestamp of migration
- Migration file name
- Success/failure status
- Operator who ran the migration

## 🔄 Regular Maintenance

### Weekly:
- [ ] Verify staging environment is up-to-date
- [ ] Test database backup/restore process
- [ ] Review migration logs

### Monthly:
- [ ] Update safety scripts if needed
- [ ] Review and test emergency procedures
- [ ] Audit production database access

---

## Quick Reference Commands

```bash
# Check environment safety
./scripts/database/check-railway-environment.sh

# Run protected production migration
./scripts/database/run-production-migration.sh <migration-file>

# Switch to staging
railway link -p carparts-staging

# Switch to production (use with caution)
railway link -p carparts-production

# View current connection
railway status
```

**Remember: When in doubt, test on staging first!**

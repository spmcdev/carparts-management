# Database Organization

## 📁 **Directory Structure**

```
database/
├── README.md                           # 📚 This documentation
├── migrations/                         # 🔄 Database migrations
│   ├── 00-consolidated-migration.sql   # ✅ ACTIVE: Complete migration history
│   └── archive/                        # 📦 Individual migrations (archived)
│       ├── 01-init.sql                 # 🏗️ Initial database structure
│       ├── 02-users.sql                # 👥 User management system
│       ├── 03-update-parts.sql         # 🔧 Parts table updates
│       ├── 04-add-parent-id.sql        # 🔗 Parent-child relationships
│       ├── 05-add-recommended-price.sql # 💰 Pricing system
│       ├── 06-add-sold-price.sql       # 💵 Sales tracking
│       ├── 07-add-cost-price.sql       # 📊 Cost management
│       ├── 08-add-local-purchase.sql   # 🛒 Purchase tracking
│       ├── 09-create-bills-table.sql   # 🧾 Billing system
│       ├── 11-create-audit-log.sql     # 📝 Audit logging
│       ├── 14-create-reserved-bills-table.sql # 📋 Reserved bills
│       ├── 15-update-bills-table.sql   # 🔄 Bills enhancements
│       ├── 16-implement-quantity-management.sql # 📦 Quantity tracking
│       ├── 17-create-refund-tracking-tables.sql # 💸 Refund system
│       └── 18-enhance-reservation-system.sql # 🎫 Enhanced reservations
└── setup/                              # ⚙️ Database setup scripts
    ├── init.sql                        # 🚀 Basic initialization
    ├── setup-database.sql              # 🏗️ Production setup
    └── setup-staging-database.sql      # 🧪 Staging setup
```

## 🎯 **File Categories**

### **🔄 Active Migrations**
- **`migrations/00-consolidated-migration.sql`** - **PRIMARY MIGRATION FILE**
  - Contains complete database schema history
  - **Use this file for all new deployments**
  - Consolidates all individual migrations (01-18)
  - ✅ **Current and maintained**

### **📦 Archived Migrations**
- **`migrations/archive/01-18*.sql`** - **HISTORICAL REFERENCE**
  - Individual migration steps preserved for history
  - **Do not use for deployments** (use consolidated version)
  - Useful for understanding evolution of schema
  - 📚 **Reference only**

### **⚙️ Setup Scripts**
- **`setup/init.sql`** - Basic database initialization
- **`setup/setup-database.sql`** - Production environment setup
- **`setup/setup-staging-database.sql`** - Staging environment setup

## 🚀 **Usage Instructions**

### **🏗️ New Database Setup**
```bash
# For production deployment
psql -f database/migrations/00-consolidated-migration.sql

# For staging setup
psql -f database/setup/setup-staging-database.sql
```

### **🧪 Development Environment**
```bash
# Initialize development database
psql -f database/setup/init.sql

# Apply full schema
psql -f database/migrations/00-consolidated-migration.sql
```

### **🔄 Deployment Scripts**
```bash
# Use existing deployment scripts (now pointing to correct location)
./scripts/database/setup-staging-db.sh
./scripts/database/run-staging-migration.sh
```

## 🗂️ **Migration History**

The consolidated migration includes all these features in chronological order:

1. **🏗️ Initial Structure** (01) - Basic parts and bills tables
2. **👥 User Management** (02) - Authentication system
3. **🔧 Parts Updates** (03) - Enhanced parts schema
4. **🔗 Relationships** (04) - Parent-child part relationships
5. **💰 Pricing System** (05-07) - Recommended, sold, and cost prices
6. **🛒 Purchase Tracking** (08) - Local purchase management
7. **🧾 Billing System** (09) - Complete billing structure
8. **📝 Audit Logging** (11) - System audit trails
9. **📋 Reserved Bills** (14-15) - Reservation system
10. **📦 Quantity Management** (16) - Inventory tracking
11. **💸 Refund System** (17) - Refund tracking tables
12. **🎫 Enhanced Reservations** (18) - Multi-item reservations

## ⚡ **Quick Reference**

| Task | File to Use | Location |
|------|-------------|----------|
| **New Deployment** | `00-consolidated-migration.sql` | `database/migrations/` |
| **Staging Setup** | `setup-staging-database.sql` | `database/setup/` |
| **Production Setup** | `setup-database.sql` | `database/setup/` |
| **Development Init** | `init.sql` | `database/setup/` |
| **Historical Reference** | `01-18*.sql` | `database/migrations/archive/` |

## 🔗 **Related Documentation**

- 📖 **Setup Guide**: `docs/database/STAGING-DATABASE-SETUP.md`
- 🚀 **Deployment**: `docs/deployment/DEPLOYMENT-CHECKLIST.md`
- 🛠️ **Scripts**: `scripts/database/README.md`

## ✅ **Benefits of This Organization**

1. **🎯 Clear Primary Migration**: One file (`00-consolidated-migration.sql`) for all deployments
2. **📚 Preserved History**: Individual migrations archived for reference
3. **🗂️ Logical Grouping**: Migrations vs Setup vs Archive
4. **🧹 Clean Root Directory**: Database files organized out of project root
5. **📖 Comprehensive Documentation**: Clear usage instructions and file purposes
6. **🔄 Updated References**: All scripts and docs point to new locations

**Result**: Professional database organization with clear deployment path and preserved migration history! 🌟

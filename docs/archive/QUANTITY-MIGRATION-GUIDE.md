# Quantity Management System Migration Guide

## Overview

This migration implements comprehensive quantity management for the car parts system, transitioning from a simple "one part = one item" model to a full inventory management system with stock tracking.

## ⚠️ IMPORTANT WARNING

**This migration will completely rebuild your database and DELETE ALL EXISTING DATA.** 

Make sure to backup any important data before proceeding.

## Database Migration Steps

### 1. Backup Current Data (Optional)
If you need to preserve any existing data, export it before running the migration:

```sql
-- Export existing parts
COPY (SELECT * FROM parts) TO '/tmp/parts_backup.csv' WITH CSV HEADER;

-- Export existing users (passwords will need to be reset)
COPY (SELECT username, role FROM users) TO '/tmp/users_backup.csv' WITH CSV HEADER;

-- Export existing bills
COPY (SELECT * FROM bills) TO '/tmp/bills_backup.csv' WITH CSV HEADER;
```

### 2. Run the Migration
Execute the migration script in your Railway PostgreSQL console:

```bash
# Connect to Railway PostgreSQL
railway connect postgres

# Or use the Railway dashboard database console
```

Copy and paste the contents of `16-implement-quantity-management.sql` into the console.

### 3. Verify Migration Success
After running the migration, verify the new schema:

```sql
-- Check tables exist
\dt

-- Check parts table structure
\d parts

-- Check sample data
SELECT * FROM parts LIMIT 5;

-- Verify constraints work
SELECT 
    p.name, 
    p.total_stock, 
    p.available_stock, 
    p.sold_stock, 
    p.reserved_stock,
    (p.available_stock + p.sold_stock + p.reserved_stock) as calculated_total
FROM parts p;
```

## Backend Deployment

### 1. Replace Main Server File
```bash
# Backup current server
cp index.js index-old.js

# Replace with quantity-enabled version
cp index-with-quantity.js index.js
```

### 2. Update Package.json (if needed)
Ensure your package.json has all required dependencies:

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "pg": "^8.8.0",
    "cors": "^2.8.5",
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0"
  }
}
```

### 3. Deploy to Railway
Since you're using GitHub integration:

```bash
# Commit and push changes
git add .
git commit -m "Implement quantity management system"
git push origin main
```

Railway will automatically deploy the changes.

## Frontend Deployment

### 1. Replace Components
```bash
# Backup current components
cp frontend/src/CarPartsManagement.js frontend/src/CarPartsManagement-old.js
cp frontend/src/Sales.js frontend/src/Sales-old.js

# Replace with quantity-enabled versions
cp frontend/src/CarPartsManagement-with-quantity.js frontend/src/CarPartsManagement.js
cp frontend/src/Sales-with-quantity.js frontend/src/Sales.js
```

### 2. Deploy to Vercel
Since you're using GitHub integration:

```bash
# Commit and push changes
git add .
git commit -m "Update frontend for quantity management"
git push origin main
```

Vercel will automatically deploy the changes.

## New Features Overview

### 1. **Quantity-Based Inventory**
- Each part now tracks: `total_stock`, `available_stock`, `sold_stock`, `reserved_stock`
- Stock consistency is automatically maintained via database constraints
- Real-time stock status updates

### 2. **Enhanced Parts Management**
- Add parts with initial stock quantity (default: 1)
- Manual stock adjustments (add/reduce stock)
- Part number support for better tracking
- Stock consistency validation

### 3. **Multi-Item, Multi-Quantity Sales**
- Shopping cart functionality
- Add multiple items with different quantities
- Real-time stock validation
- Flexible pricing per transaction

### 4. **Advanced Bill Management**
- Bills now contain detailed line items
- Each line item tracks: part, quantity, unit price, total price
- Total quantity and amount calculated automatically
- Enhanced bill editing and refund processing

### 5. **Stock Movement Tracking**
- Complete audit trail of all stock changes
- Track sales, returns, adjustments, restocks
- Reference to originating transactions
- Stock movement history

### 6. **Automated Stock Status**
- Real-time status calculation based on available stock
- Database triggers maintain status consistency
- Visual indicators for stock levels

## API Changes

### New Endpoints
- `GET /parts/available` - Get parts with available stock > 0
- `POST /sales/sell` - Process multi-item sales
- `POST /bills/:id/refund` - Process refunds with stock restoration
- `PATCH /parts/:id` - Enhanced part updates with stock management

### Modified Endpoints
- `GET /parts` - Now includes quantity fields
- `POST /parts` - Now supports initial stock quantity
- `GET /bills` - Now includes detailed line items
- `PUT /bills/:id` - Enhanced bill editing

## Database Schema Changes

### New Tables
- `bill_items` - Detailed line items for each bill
- `stock_movements` - Complete stock movement audit trail

### Enhanced Tables
- `parts` - Added quantity fields and constraints
- `bills` - Added quantity totals and enhanced refund tracking
- `reserved_bills` - Added quantity support

### New Functions
- `update_part_stock_status()` - Auto-update stock status
- `log_stock_movement()` - Stock movement logging

## Testing the Migration

### 1. Test Parts Management
- Add a new part with quantity 10
- Verify stock shows: Total=10, Available=10, Sold=0, Reserved=0
- Edit part to adjust available stock
- Verify stock consistency

### 2. Test Sales Process
- Add items to cart with different quantities
- Process a multi-item sale
- Verify stock reduction and bill creation
- Check stock movement logs

### 3. Test Refund Process
- Process a full refund
- Verify stock restoration
- Check updated bill status

### 4. Test Stock Adjustments
- Use +Stock/-Stock buttons in Parts Management
- Verify stock movements are logged
- Check stock consistency maintained

## Rollback Plan (if needed)

If you need to rollback:

```bash
# Restore old backend
cp index-old.js index.js

# Restore old frontend
cp frontend/src/CarPartsManagement-old.js frontend/src/CarPartsManagement.js
cp frontend/src/Sales-old.js frontend/src/Sales.js

# Restore old database (if backup exists)
# Run your previous migration scripts
```

## Support and Troubleshooting

### Common Issues

1. **Stock Consistency Errors**
   - Ensure total_stock = available_stock + sold_stock + reserved_stock
   - Check for negative stock values

2. **Migration Failures**
   - Check PostgreSQL logs for constraint violations
   - Ensure all foreign key references exist

3. **Frontend Connection Issues**
   - Verify API endpoints are correctly configured
   - Check CORS settings in backend

### Health Check

After deployment, run the production health check:

```bash
npm run health-check
```

This will validate all system components including the new quantity management features.

## Contact

For any issues during migration, check the system logs and ensure all components are properly deployed through the GitHub integration workflows.

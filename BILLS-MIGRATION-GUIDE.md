# Database Migration Guide for Bills Table Update

## Migration File: 15-update-bills-table.sql

### What this migration does:
1. **Removes UNIQUE constraint** from bill_number column (allows duplicate/optional bill numbers)
2. **Makes bill_number nullable** (allows users to optionally provide bill numbers)
3. **Adds customer_phone column** if it doesn't exist
4. **Adds performance indexes** for better query performance

### Steps to run migration:
1. Connect to your Railway PostgreSQL database
2. Execute the SQL commands in `15-update-bills-table.sql`
3. Verify the changes worked correctly

### Railway PostgreSQL Connection:
```bash
# Use Railway CLI or connect via Railway dashboard
railway connect postgres
```

### Alternative - Manual SQL execution:
You can copy and paste the SQL from `15-update-bills-table.sql` into your Railway database console.

### Verification:
After running the migration, you can verify it worked by checking:
- Bill number is now optional in new bills
- Edit bills functionality works via PUT /bills/:id endpoint
- Bills table shows customer_phone column

### New API Endpoints Available:
- **PUT /bills/:id** - Edit existing bills
- **POST /bills** - Create bills with optional bill_number
- **GET /bills** - Retrieve bills (now includes customer_phone)

### New Features:
1. **System-generated Billing ID**: Each bill gets a unique auto-increment ID
2. **Optional Bill Number**: Users can provide custom bill numbers or leave empty
3. **Edit Bills**: Bills can be updated after creation
4. **Non-unique Bill Numbers**: Multiple bills can have same bill number if needed

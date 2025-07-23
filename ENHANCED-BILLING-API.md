# Enhanced Billing System - Complete API Documentation

## Overview
The billing system now supports:
- ✅ **System-generated unique Billing IDs**
- ✅ **Optional Bill Numbers** (user can provide or leave empty)
- ✅ **Full Bill Editing** capabilities
- ✅ **Refund Management** (full and partial refunds)
- ✅ **Status Tracking** (active, refunded, partially_refunded)

## Database Migration Required
Run `15-update-bills-table.sql` to enable all features:
```sql
-- This migration adds:
-- - Removes UNIQUE constraint from bill_number
-- - Makes bill_number nullable
-- - Adds customer_phone column
-- - Adds refund tracking fields (status, refund_date, refund_reason, refund_amount, refunded_by)
```

## API Endpoints

### 1. GET /bills - Retrieve All Bills
**Purpose**: Get all bills with optional status filtering

**Query Parameters**:
- `status` (optional): Filter by status - `active`, `refunded`, `partially_refunded`

**Response**:
```json
[
  {
    "id": 1,
    "customer_name": "John Doe",
    "customer_phone": "+1234567890",
    "bill_number": "CUSTOM-001",
    "date": "2025-07-24",
    "items": [...],
    "status": "active",
    "refund_date": null,
    "refund_reason": null,
    "refund_amount": null,
    "refunded_by": null
  }
]
```

### 2. GET /bills/:id - Get Single Bill
**Purpose**: Retrieve specific bill details

**Response**: Same structure as above, single object

### 3. POST /bills - Create New Bill
**Purpose**: Create a new bill with optional bill number

**Request Body**:
```json
{
  "customerName": "John Doe",
  "customerPhone": "+1234567890",
  "billNumber": "OPTIONAL-001", // Optional - can be omitted
  "items": [
    {
      "part_name": "Brake Pad",
      "manufacturer": "Honda",
      "quantity": 1,
      "unit_price": 5000,
      "total_price": 5000
    }
  ]
}
```

### 4. PUT /bills/:id - Edit Existing Bill
**Purpose**: Update bill details including bill number and refund status

**Request Body**:
```json
{
  "customer_name": "Updated Customer",
  "customer_phone": "+9876543210",
  "bill_number": "NEW-BILL-001",
  "items": [...],
  "status": "active", // Optional: active, refunded, partially_refunded
  "refund_reason": "Customer request", // Required if status is refunded
  "refund_amount": 2500.00 // Required for partial refunds
}
```

### 5. POST /bills/:id/refund - Process Refund
**Purpose**: Dedicated endpoint for processing refunds

**Request Body**:
```json
{
  "refund_type": "full", // "full" or "partial"
  "refund_amount": 2500.00, // Required for partial refunds
  "refund_reason": "Defective product"
}
```

**Response**:
```json
{
  "message": "Bill full refund processed successfully",
  "bill": {
    "id": 1,
    "status": "refunded",
    "refund_date": "2025-07-24",
    "refund_reason": "Defective product",
    "refund_amount": 5000.00,
    "refunded_by": 1,
    ...
  }
}
```

## Bill Status Types

1. **active** - Normal active bill
2. **refunded** - Fully refunded bill
3. **partially_refunded** - Partially refunded bill

## Features Summary

### ✅ System-Generated IDs
- Each bill gets unique auto-increment `id` field
- This is the primary identifier for all operations

### ✅ Optional Bill Numbers
- Users can provide custom bill numbers
- Bill numbers can be duplicate or null
- No system-generated bill numbers unless user provides

### ✅ Full Editing Capability
- Update customer information
- Change bill numbers for existing bills
- Modify items and quantities
- Change refund status

### ✅ Refund Management
- **Full Refunds**: Mark bill as completely refunded
- **Partial Refunds**: Specify partial refund amount
- **Refund Tracking**: Date, reason, amount, and user who processed
- **Audit Trail**: All refund actions are logged

### ✅ Enhanced Data Tracking
- Customer phone numbers
- Refund dates and reasons
- User who processed refunds
- Complete audit logging for all changes

## Usage Examples

### Create Bill Without Bill Number:
```bash
POST /bills
{
  "customerName": "Jane Smith",
  "customerPhone": "555-0123",
  "items": [...]
}
# Result: Bill created with id=10, bill_number=null
```

### Update Bill Number:
```bash
PUT /bills/10
{
  "customer_name": "Jane Smith",
  "customer_phone": "555-0123", 
  "bill_number": "JS-2025-001",
  "items": [...]
}
# Result: Bill now has custom bill number
```

### Process Full Refund:
```bash
POST /bills/10/refund
{
  "refund_type": "full",
  "refund_reason": "Product recall"
}
# Result: Bill marked as refunded with current date
```

### Process Partial Refund:
```bash
POST /bills/10/refund
{
  "refund_type": "partial",
  "refund_amount": 1500.00,
  "refund_reason": "Partial return"
}
# Result: Bill marked as partially_refunded
```

### Filter Refunded Bills:
```bash
GET /bills?status=refunded
# Returns only refunded bills
```

## Migration Steps
1. Run the SQL migration: `15-update-bills-table.sql`
2. Verify new columns exist in bills table
3. Test the new endpoints
4. Update frontend to use new features

This enhanced billing system provides complete flexibility for managing bills, refunds, and customer information while maintaining full audit trails.

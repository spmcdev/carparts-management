# Partial Refund Functionality - Quick Reference

## Overview
The enhanced refund system now supports both full and partial refunds with detailed item-level tracking, automatic stock management, and comprehensive audit trails.

## Features Implemented

### 1. Bill Details View (Inline Collapse)
- **Location**: Sales History page
- **Trigger**: Click "View Details" button next to any bill
- **Functionality**: Shows/hides bill items inline without page refresh
- **Display**: Part names, manufacturers, quantities, prices

### 2. Enhanced Search
- **Location**: Sales History search field
- **Scope**: Bill numbers, customer names, phone numbers, part names, manufacturers
- **Real-time**: Filters results as you type
- **Case-insensitive**: Works with partial matches

### 3. Partial Refund System
- **Access**: Click "Refund" button on any bill
- **Options**: 
  - Full Refund: Refunds entire bill amount
  - Partial Refund: Select specific items and quantities
- **Features**:
  - Item selection table with quantity inputs
  - Real-time total calculation
  - Stock restoration for refunded items
  - Input validation (prevents over-refunding)

## How to Use

### View Bill Details
1. Go to Sales History page
2. Click the "View Details" button (👁️) next to any bill
3. Bill items will expand inline showing:
   - Part names and manufacturers
   - Quantities sold
   - Unit prices and totals

### Search Bills
1. Use the search field at the top of Sales History
2. Search by:
   - Bill number
   - Customer name or phone
   - Part name
   - Manufacturer
3. Results filter in real-time

### Process Partial Refund
1. Click "Refund" button on the bill you want to refund
2. In the refund modal:
   - Select "Partial Refund" radio button
   - Choose items to refund using checkboxes
   - Enter quantities to refund (cannot exceed original quantity)
   - Add refund reason
   - Review calculated total
3. Click "Process Refund"
4. Stock will be automatically restored for refunded items

## Database Changes

### New Tables Created
- `bill_refunds`: Main refund records with type tracking
- `bill_refund_items`: Item-level refund details

### Existing Tables Enhanced
- `bills`: Added refund status tracking columns

## API Changes

### Enhanced Refund Endpoint
- **URL**: `POST /bills/:id/refund`
- **New Parameters**:
  - `refund_type`: 'full' or 'partial'
  - `refund_items`: Array of items to refund (for partial refunds)
- **Features**:
  - Validates refund items against original bill
  - Automatically restores stock
  - Creates detailed refund tracking records
  - Updates bill status appropriately

## Migration Required

Run the following SQL migration file:
```sql
17-create-refund-tracking-tables.sql
```

This creates the necessary tables for detailed refund tracking.

## Security & Validation

- ✅ Admin authentication required for all refund operations
- ✅ Prevents over-refunding (quantity validation)
- ✅ Validates refund items exist in original bill
- ✅ Database constraints ensure data integrity
- ✅ Complete audit trail for all refund activities
- ✅ Transaction-safe operations (rollback on errors)

## Benefits

1. **Better Customer Service**: Easy partial refunds for customer satisfaction
2. **Accurate Inventory**: Automatic stock restoration keeps inventory accurate
3. **Detailed Tracking**: Complete history of all refund activities
4. **Multiple Refunds**: Support for multiple partial refunds on same bill
5. **User-Friendly**: Intuitive interface with real-time feedback
6. **Data Integrity**: Comprehensive validation and error handling

## Support for Multiple Refunds

The system supports multiple partial refunds on the same bill:
- Each refund creates a separate record in `bill_refunds`
- Item-level details tracked in `bill_refund_items`
- Bill status updates automatically:
  - 'active' → 'partially_refunded' → 'refunded'
- Running total of refunds tracked on the bill

This comprehensive system provides maximum flexibility while maintaining data integrity and audit trails.

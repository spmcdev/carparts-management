# Sold Stock Report API Documentation

## Overview
The sold stock report functionality provides comprehensive reporting on parts that have been sold, with advanced filtering capabilities and detailed revenue tracking.

## API Endpoints

### 1. GET `/sold-stock-report` - Detailed Sold Stock Report

Returns detailed information about sold parts with filtering and pagination options.

#### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `container_no` | string | No | Filter by specific container number |
| `local_purchase` | boolean | No | Filter by local purchase (true) or container purchase (false) |
| `from_date` | date | No | Start date for filtering (YYYY-MM-DD format) |
| `to_date` | date | No | End date for filtering (YYYY-MM-DD format) |
| `page` | integer | No | Page number for pagination (default: 1) |
| `limit` | integer | No | Number of items per page (default: 20) |

#### Example Requests

```bash
# Get all sold stock with default pagination
GET /sold-stock-report

# Filter by container number
GET /sold-stock-report?container_no=CNT001

# Filter by local purchases only
GET /sold-stock-report?local_purchase=true

# Filter by date range
GET /sold-stock-report?from_date=2024-01-01&to_date=2024-12-31

# Combined filters with pagination
GET /sold-stock-report?container_no=CNT001&page=2&limit=25
```

#### Response Structure

```json
{
  "sold_stock": [
    {
      "sale_details": {
        "bill_id": 123,
        "bill_number": "INV-001",
        "bill_date": "2024-01-15",
        "bill_status": "active",
        "sale_date": "2024-01-15T10:30:00Z",
        "sold_by": "admin"
      },
      "customer_details": {
        "customer_name": "John Doe",
        "customer_phone": "+1234567890"
      },
      "part_details": {
        "part_id": 45,
        "part_name": "Brake Pad",
        "manufacturer": "Toyota",
        "part_number": "BP-001",
        "container_no": "CNT001",
        "local_purchase": false,
        "cost_price": 25.00,
        "recommended_price": 35.00
      },
      "sale_metrics": {
        "sold_quantity": 2,
        "sold_price": 32.50,
        "sale_total": 65.00,
        "profit_margin": "23.08%"
      }
    }
  ],
  "summary": {
    "total_items_sold": 150,
    "total_bills": 75,
    "unique_parts_sold": 45,
    "total_quantity_sold": 300,
    "total_revenue": 12500.00,
    "average_selling_price": 41.67,
    "earliest_sale": "2024-01-01",
    "latest_sale": "2024-01-31",
    "local_purchase_items": 50,
    "container_items": 100,
    "unique_containers": 5
  },
  "filters_applied": {
    "container_no": "CNT001",
    "local_purchase": null,
    "from_date": "2024-01-01",
    "to_date": "2024-01-31"
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "offset": 0
  }
}
```

### 2. GET `/sold-stock-summary` - Sold Stock Summary

Returns aggregated statistics and top-selling parts without detailed item listings.

#### Query Parameters

Same filtering parameters as the detailed report (no pagination parameters needed).

#### Example Requests

```bash
# Get summary for all sold stock
GET /sold-stock-summary

# Get summary for local purchases only
GET /sold-stock-summary?local_purchase=true

# Get summary for specific date range
GET /sold-stock-summary?from_date=2024-01-01&to_date=2024-01-31
```

#### Response Structure

```json
{
  "summary": {
    "total_items_sold": 150,
    "total_bills": 75,
    "unique_parts_sold": 45,
    "total_quantity_sold": 300,
    "total_revenue": 12500.00,
    "average_selling_price": 41.67,
    "min_selling_price": 15.00,
    "max_selling_price": 250.00,
    "earliest_sale": "2024-01-01",
    "latest_sale": "2024-01-31",
    "local_purchase_items": 50,
    "container_items": 100,
    "unique_containers": 5,
    "local_purchase_revenue": 3500.00,
    "container_revenue": 9000.00,
    "estimated_profit": 2800.00
  },
  "top_selling_parts": [
    {
      "name": "Brake Pad",
      "manufacturer": "Toyota",
      "container_no": "CNT001",
      "local_purchase": false,
      "total_sold": 25,
      "total_revenue": 750.00,
      "times_sold": 12,
      "avg_price": 30.00
    }
  ],
  "filters_applied": {
    "container_no": null,
    "local_purchase": true,
    "from_date": "2024-01-01",
    "to_date": "2024-01-31"
  }
}
```

## Filter Combinations

The API supports various filter combinations:

1. **Container-specific reports**: Filter by `container_no` to see sales from specific shipments
2. **Local vs Container purchases**: Use `local_purchase=true` for local sourced parts, `false` for container parts
3. **Date range analysis**: Combine `from_date` and `to_date` for period-specific reporting
4. **Combined filtering**: Mix any filters for precise reporting needs

## Frontend Integration Example

```javascript
// Fetch sold stock report with filters
async function fetchSoldStockReport(filters = {}) {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      params.append(key, value);
    }
  });
  
  const response = await fetch(`/sold-stock-report?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
}

// Usage examples
const allSoldStock = await fetchSoldStockReport();
const containerReport = await fetchSoldStockReport({ container_no: 'CNT001' });
const localPurchases = await fetchSoldStockReport({ local_purchase: true });
const dateRangeReport = await fetchSoldStockReport({ 
  from_date: '2024-01-01', 
  to_date: '2024-01-31' 
});
```

## Authentication

Both endpoints require valid authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200`: Success
- `401`: Unauthorized (missing or invalid token)
- `500`: Internal server error

Error responses include descriptive messages:

```json
{
  "error": "Failed to fetch sold stock report",
  "details": "Specific error message"
}
```

## Notes

1. **Date format**: Use YYYY-MM-DD format for date parameters
2. **Boolean values**: Use 'true'/'false' strings for boolean parameters
3. **Pagination**: Default page size is 20 items, maximum recommended is 100
4. **Performance**: Large datasets may take longer to process; consider using date filters
5. **Profit calculations**: Require `cost_price` data in parts table for accurate profit margins

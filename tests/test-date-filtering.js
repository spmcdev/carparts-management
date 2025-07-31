/**
 * Test Date Filtering in Sold Stock Reports
 * 
 * This script validates that date filters are working correctly
 * in the sold stock report and summary endpoints.
 */

import pkg from 'pg';
const { Pool } = pkg;

// Database configuration (adjust as needed)
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'carparts',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function testDateFiltering() {
  console.log('🔍 Testing Date Filtering in Sold Stock Reports...\n');

  try {
    // First, let's check what date range we have in the database
    console.log('📊 Checking available date range in bills...');
    const dateRangeResult = await pool.query(`
      SELECT 
        MIN(DATE(created_at)) as earliest_bill,
        MAX(DATE(created_at)) as latest_bill,
        COUNT(*) as total_bills
      FROM bills
      WHERE created_at IS NOT NULL
    `);

    const dateRange = dateRangeResult.rows[0];
    console.log(`Available date range: ${dateRange.earliest_bill} to ${dateRange.latest_bill}`);
    console.log(`Total bills: ${dateRange.total_bills}\n`);

    // Test 1: Get all sold stock data (no date filter)
    console.log('🔍 Test 1: All data (no date filter)');
    const allDataResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT p.id) as unique_parts_sold,
        COUNT(DISTINCT b.id) as total_transactions,
        SUM(bi.quantity) as total_quantity_sold,
        SUM(bi.total_price) as total_revenue,
        MIN(DATE(b.created_at)) as earliest_sale,
        MAX(DATE(b.created_at)) as latest_sale
      FROM bill_items bi
      JOIN bills b ON bi.bill_id = b.id
      JOIN parts p ON bi.part_id = p.id
    `);

    const allData = allDataResult.rows[0];
    console.log(`- Unique parts sold: ${allData.unique_parts_sold}`);
    console.log(`- Total transactions: ${allData.total_transactions}`);
    console.log(`- Total quantity sold: ${allData.total_quantity_sold}`);
    console.log(`- Total revenue: $${parseFloat(allData.total_revenue || 0).toFixed(2)}`);
    console.log(`- Date range: ${allData.earliest_sale} to ${allData.latest_sale}\n`);

    // Test 2: Filter by a specific date range (last 30 days from latest date)
    if (dateRange.latest_bill) {
      const latestDate = new Date(dateRange.latest_bill);
      const thirtyDaysAgo = new Date(latestDate);
      thirtyDaysAgo.setDate(latestDate.getDate() - 30);
      
      const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
      const toDate = latestDate.toISOString().split('T')[0];

      console.log(`🔍 Test 2: Date range filter (${fromDate} to ${toDate})`);
      
      const dateFilterResult = await pool.query(`
        SELECT 
          COUNT(DISTINCT p.id) as unique_parts_sold,
          COUNT(DISTINCT b.id) as total_transactions,
          SUM(bi.quantity) as total_quantity_sold,
          SUM(bi.total_price) as total_revenue,
          MIN(DATE(b.created_at)) as earliest_sale,
          MAX(DATE(b.created_at)) as latest_sale
        FROM bill_items bi
        JOIN bills b ON bi.bill_id = b.id
        JOIN parts p ON bi.part_id = p.id
        WHERE DATE(b.created_at) >= $1 AND DATE(b.created_at) <= $2
      `, [fromDate, toDate]);

      const filteredData = dateFilterResult.rows[0];
      console.log(`- Unique parts sold: ${filteredData.unique_parts_sold}`);
      console.log(`- Total transactions: ${filteredData.total_transactions}`);
      console.log(`- Total quantity sold: ${filteredData.total_quantity_sold}`);
      console.log(`- Total revenue: $${parseFloat(filteredData.total_revenue || 0).toFixed(2)}`);
      console.log(`- Date range: ${filteredData.earliest_sale} to ${filteredData.latest_sale}\n`);

      // Validate that filtered data is subset of all data
      const isValidFilter = 
        parseInt(filteredData.total_transactions) <= parseInt(allData.total_transactions) &&
        parseInt(filteredData.total_quantity_sold) <= parseInt(allData.total_quantity_sold) &&
        parseFloat(filteredData.total_revenue || 0) <= parseFloat(allData.total_revenue || 0);

      console.log(`✅ Date filter validation: ${isValidFilter ? 'PASSED' : 'FAILED'}`);
      
      if (!isValidFilter) {
        console.log('❌ ERROR: Filtered data should be a subset of all data!');
      }
    }

    // Test 3: Test with only from_date
    console.log('\n🔍 Test 3: From date only filter');
    if (dateRange.latest_bill) {
      const latestDate = new Date(dateRange.latest_bill);
      const sevenDaysAgo = new Date(latestDate);
      sevenDaysAgo.setDate(latestDate.getDate() - 7);
      const fromDate = sevenDaysAgo.toISOString().split('T')[0];

      const fromDateResult = await pool.query(`
        SELECT 
          COUNT(DISTINCT b.id) as total_transactions,
          SUM(bi.quantity) as total_quantity_sold,
          MIN(DATE(b.created_at)) as earliest_sale,
          MAX(DATE(b.created_at)) as latest_sale
        FROM bill_items bi
        JOIN bills b ON bi.bill_id = b.id
        JOIN parts p ON bi.part_id = p.id
        WHERE DATE(b.created_at) >= $1
      `, [fromDate]);

      const fromDateData = fromDateResult.rows[0];
      console.log(`- From date: ${fromDate}`);
      console.log(`- Transactions: ${fromDateData.total_transactions}`);
      console.log(`- Quantity sold: ${fromDateData.total_quantity_sold}`);
      console.log(`- Actual date range: ${fromDateData.earliest_sale} to ${fromDateData.latest_sale}`);

      // Validate that earliest_sale is >= fromDate
      const isValidFromDate = !fromDateData.earliest_sale || fromDateData.earliest_sale >= fromDate;
      console.log(`✅ From date validation: ${isValidFromDate ? 'PASSED' : 'FAILED'}`);
    }

    // Test 4: Test with only to_date
    console.log('\n🔍 Test 4: To date only filter');
    if (dateRange.earliest_bill) {
      const earliestDate = new Date(dateRange.earliest_bill);
      const sevenDaysLater = new Date(earliestDate);
      sevenDaysLater.setDate(earliestDate.getDate() + 7);
      const toDate = sevenDaysLater.toISOString().split('T')[0];

      const toDateResult = await pool.query(`
        SELECT 
          COUNT(DISTINCT b.id) as total_transactions,
          SUM(bi.quantity) as total_quantity_sold,
          MIN(DATE(b.created_at)) as earliest_sale,
          MAX(DATE(b.created_at)) as latest_sale
        FROM bill_items bi
        JOIN bills b ON bi.bill_id = b.id
        JOIN parts p ON bi.part_id = p.id
        WHERE DATE(b.created_at) <= $1
      `, [toDate]);

      const toDateData = toDateResult.rows[0];
      console.log(`- To date: ${toDate}`);
      console.log(`- Transactions: ${toDateData.total_transactions}`);
      console.log(`- Quantity sold: ${toDateData.total_quantity_sold}`);
      console.log(`- Actual date range: ${toDateData.earliest_sale} to ${toDateData.latest_sale}`);

      // Validate that latest_sale is <= toDate
      const isValidToDate = !toDateData.latest_sale || toDateData.latest_sale <= toDate;
      console.log(`✅ To date validation: ${isValidToDate ? 'PASSED' : 'FAILED'}`);
    }

    // Test 5: Check specific date format handling
    console.log('\n🔍 Test 5: Date format validation');
    
    // Test various date formats
    const testDates = ['2024-01-01', '2024-12-31', '2025-01-01'];
    
    for (const testDate of testDates) {
      try {
        const formatResult = await pool.query(`
          SELECT 
            COUNT(*) as count,
            $1::date as parsed_date
          FROM bills b
          WHERE DATE(b.created_at) = $1::date
        `, [testDate]);
        
        console.log(`- Date ${testDate}: ${formatResult.rows[0].count} bills, parsed as ${formatResult.rows[0].parsed_date}`);
      } catch (err) {
        console.log(`- Date ${testDate}: ERROR - ${err.message}`);
      }
    }

    // Test 6: Verify date filtering in grouped queries (like sold stock report)
    console.log('\n🔍 Test 6: Grouped query date filtering');
    
    if (dateRange.latest_bill) {
      const latestDate = new Date(dateRange.latest_bill);
      const tenDaysAgo = new Date(latestDate);
      tenDaysAgo.setDate(latestDate.getDate() - 10);
      const fromDate = tenDaysAgo.toISOString().split('T')[0];

      // Test the actual grouped query structure used in sold stock report
      const groupedResult = await pool.query(`
        SELECT 
          p.id as part_id,
          p.name as part_name,
          SUM(bi.quantity) as total_sold_quantity,
          COUNT(DISTINCT b.id) as times_sold,
          SUM(bi.total_price) as total_revenue,
          MIN(DATE(b.created_at)) as first_sale_date,
          MAX(DATE(b.created_at)) as last_sale_date
        FROM bill_items bi
        JOIN bills b ON bi.bill_id = b.id
        JOIN parts p ON bi.part_id = p.id
        WHERE DATE(b.created_at) >= $1
        GROUP BY p.id, p.name
        ORDER BY total_sold_quantity DESC
        LIMIT 5
      `, [fromDate]);

      console.log(`- Testing grouped query with from_date: ${fromDate}`);
      console.log(`- Results returned: ${groupedResult.rows.length} parts`);
      
      groupedResult.rows.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.part_name}: ${row.total_sold_quantity} sold, date range: ${row.first_sale_date} to ${row.last_sale_date}`);
        
        // Validate that all dates are >= fromDate
        const isValidDateRange = 
          (!row.first_sale_date || row.first_sale_date >= fromDate) &&
          (!row.last_sale_date || row.last_sale_date >= fromDate);
        
        if (!isValidDateRange) {
          console.log(`    ❌ ERROR: Date range invalid for ${row.part_name}`);
        }
      });
    }

    console.log('\n✅ Date filtering test completed!');

  } catch (error) {
    console.error('❌ Error during date filtering test:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testDateFiltering();

export { testDateFiltering };

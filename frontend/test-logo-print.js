// Test to verify logo is included in printed bills
// You can run this in a browser console to test the print functionality

// Mock bill data for testing
const testBill = {
  id: 1,
  bill_number: 'TEST001',
  date: new Date().toISOString(),
  customer_name: 'Test Customer',
  customer_phone: '1234567890',
  total_quantity: 2,
  total_amount: 1500.00,
  items: [
    {
      part_name: 'Test Part 1',
      manufacturer: 'Test Manufacturer',
      quantity: 1,
      unit_price: 1000.00,
      total_price: 1000.00
    },
    {
      part_name: 'Test Part 2',
      manufacturer: 'Another Manufacturer',
      quantity: 1,
      unit_price: 500.00,
      total_price: 500.00
    }
  ]
};

// Test function to verify logo appears in print
function testPrintBillWithLogo() {
  const printWindow = window.open('', '_blank');
  
  // Base64 encoded logo SVG
  const logoSvg = `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="120" height="120">
      <path d="M20 100 C20 53.8 58.8 15 105 15 C151.2 15 190 53.8 190 100 C190 146.2 151.2 185 105 185 C58.8 185 20 146.2 20 100 Z" fill="#1a1a1a"/>
      <path d="M105 100 C105 127.6 127.4 150 155 150 C182.6 150 205 127.6 205 100 C205 72.4 182.6 50 155 50 C127.4 50 105 72.4 105 100 Z" fill="#f4c430" transform="translate(-15,15)"/>
      <path d="M60 70 C60 60 68 52 78 52 L98 52 C108 52 116 60 116 70 L116 85 C116 95 108 103 98 103 L85 103 L108 130 L95 130 L75 105 L75 130 L60 130 L60 70 Z M75 67 L75 88 L98 88 C100 88 101 87 101 85 L101 70 C101 68 100 67 98 67 L78 67 C76 67 75 68 75 70 L75 67 Z" fill="white"/>
    </svg>
  `)}`;

  printWindow.document.write(`
    <html>
      <head>
        <title>Bill #${testBill.bill_number || testBill.id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { margin-bottom: 15px; }
          .company-info { margin-bottom: 20px; }
          .bill-info { margin-bottom: 20px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .items-table th { background-color: #f2f2f2; }
          .total { text-align: right; font-weight: bold; font-size: 18px; }
          .footer { margin-top: 30px; text-align: center; }
          @media print {
            body { margin: 15px; }
            .logo img { max-width: 100px; height: auto; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">
            <img src="${logoSvg}" alt="Rasuki Group Logo" style="width: 120px; height: 120px;">
          </div>
          <div class="company-info">
            <h1>Rasuki Group</h1>
            <h2>Car Parts Sales Invoice</h2>
          </div>
        </div>
        <div class="bill-info">
          <p><strong>Bill Number:</strong> ${testBill.bill_number || testBill.id}</p>
          <p><strong>Date:</strong> ${new Date(testBill.date).toLocaleDateString()}</p>
          <p><strong>Customer:</strong> ${testBill.customer_name}</p>
          ${testBill.customer_phone ? `<p><strong>Phone:</strong> ${testBill.customer_phone}</p>` : ''}
        </div>
        <table class="items-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Manufacturer</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${testBill.items.map(item => `
              <tr>
                <td>${item.part_name}</td>
                <td>${item.manufacturer || 'N/A'}</td>
                <td>${item.quantity}</td>
                <td>Rs ${parseFloat(item.unit_price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                <td>Rs ${parseFloat(item.total_price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total">
          <p>Total Quantity: ${testBill.total_quantity}</p>
          <p>Total Amount: Rs ${parseFloat(testBill.total_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
        </div>
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Rasuki Group - Quality Car Parts</p>
        </div>
      </body>
    </html>
  `);
  
  printWindow.document.close();
  
  console.log('Test print window opened. You should see the Rasuki Group logo at the top of the bill.');
  
  return printWindow;
}

// Instructions for testing:
console.log('To test the logo in printed bills, run: testPrintBillWithLogo()');

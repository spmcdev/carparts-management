import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from './config/api';

function StockManagement({ userRole }) {
  const [availableStock, setAvailableStock] = useState([]);
  const [soldStock, setSoldStock] = useState([]);
  const [parentChildRelations, setParentChildRelations] = useState([]);
  const [parentParts, setParentParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [token] = useState(localStorage.getItem('token') || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showSoldStock, setShowSoldStock] = useState(false);
  const [showAvailableStock, setShowAvailableStock] = useState(false);
  const [showParentChildRelations, setShowParentChildRelations] = useState(false);
  const [showParentParts, setShowParentParts] = useState(false);
  
  // New state for enhanced sold stock report
  const [containerNo, setContainerNo] = useState('');
  const [localPurchaseFilter, setLocalPurchaseFilter] = useState('');
  const [soldStockData, setSoldStockData] = useState(null);
  const [soldStockSummary, setSoldStockSummary] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // New state for available stock filters
  const [availableContainerNo, setAvailableContainerNo] = useState('');
  const [availableLocalPurchaseFilter, setAvailableLocalPurchaseFilter] = useState('');
  const [availableContainers, setAvailableContainers] = useState([]);
  const [autoRefreshing, setAutoRefreshing] = useState(false);

  // New state for parent parts filters
  const [parentContainerNo, setParentContainerNo] = useState('');
  const [parentLocalPurchaseFilter, setParentLocalPurchaseFilter] = useState('');

  // New state for comprehensive stock report (available + sold)
  const [comprehensiveStock, setComprehensiveStock] = useState([]);
  const [showComprehensiveStock, setShowComprehensiveStock] = useState(false);
  const [comprehensiveContainerNo, setComprehensiveContainerNo] = useState('');
  const [comprehensiveLocalPurchaseFilter, setComprehensiveLocalPurchaseFilter] = useState('');

  const printStockReport = (stockData, reportType, dateRange = null, includeProfit = false) => {
    // Base64 encoded logo SVG
    const logoSvg = `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="80" height="80">
        <path d="M20 100 C20 53.8 58.8 15 105 15 C151.2 15 190 53.8 190 100 C190 146.2 151.2 185 105 185 C58.8 185 20 146.2 20 100 Z" fill="#1a1a1a"/>
        <path d="M105 100 C105 127.6 127.4 150 155 150 C182.6 150 205 127.6 205 100 C205 72.4 182.6 50 155 50 C127.4 50 105 72.4 105 100 Z" fill="#f4c430" transform="translate(-15,15)"/>
        <path d="M60 70 C60 60 68 52 78 52 L98 52 C108 52 116 60 116 70 L116 85 C116 95 108 103 98 103 L85 103 L108 130 L95 130 L75 105 L75 130 L60 130 L60 70 Z M75 67 L75 88 L98 88 C100 88 101 87 101 85 L101 70 C101 68 100 67 98 67 L78 67 C76 67 75 68 75 70 L75 67 Z" fill="white"/>
      </svg>
    `)}`;

    const printContent = `
      <html>
        <head>
          <title>${reportType} Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .logo { margin-bottom: 10px; }
            .company-info { margin-bottom: 15px; }
            .report-details { margin-bottom: 20px; }
            .stock-table { width: 100%; border-collapse: collapse; }
            .stock-table th, .stock-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .stock-table th { background-color: #f2f2f2; }
            .summary { margin-top: 20px; font-weight: bold; }
            @media print { 
              button { display: none; } 
              body { margin: 15px; }
              .logo img { max-width: 60px; height: auto; }
            }
            .stats { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .stat-box { border: 1px solid #ddd; padding: 10px; margin: 5px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">
              <img src="${logoSvg}" alt="Rasuki Group Logo" style="width: 80px; height: 80px;">
            </div>
            <div class="company-info">
              <h1>Rasuki Group</h1>
              <h2>${reportType} Report</h2>
            </div>
          </div>
          <div class="report-details">
            <p><strong>Generated On:</strong> ${new Date().toLocaleDateString()}</p>
            ${dateRange ? `<p><strong>Date Range:</strong> ${dateRange}</p>` : ''}
            <p><strong>Total Items:</strong> ${stockData.length}</p>
          </div>
          ${reportType === 'Available Stock' ? `
            <div class="stats">
              <div class="stat-box">
                <h4>Total Available Parts</h4>
                <p>${stockData.length} parts</p>
              </div>
              <div class="stat-box">
                <h4>Total Available Quantity</h4>
                <p>${stockData.reduce((total, item) => total + parseInt(item.available_stock || 0), 0)} units</p>
              </div>
              <div class="stat-box">
                <h4>Total Inventory Cost</h4>
                <p>Rs. ${stockData.reduce((total, item) => total + (parseInt(item.available_stock || 0) * parseFloat(item.cost_price || 0)), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div class="stat-box">
                <h4>Total Inventory Value</h4>
                <p>Rs. ${stockData.reduce((total, item) => total + (parseInt(item.available_stock || 0) * parseFloat(item.recommended_price || 0)), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          ` : reportType === 'Parent Parts' ? `
            <div class="stats">
              <div class="stat-box">
                <h4>Total Parent Parts</h4>
                <p>${stockData.length} parts</p>
              </div>
              <div class="stat-box">
                <h4>Total Children Parts</h4>
                <p>${stockData.reduce((total, item) => total + parseInt(item.children_count || 0), 0)} parts</p>
              </div>
              <div class="stat-box">
                <h4>Total Parent Inventory Cost</h4>
                <p>Rs. ${stockData.reduce((total, item) => total + (parseInt(item.total_stock || 0) * parseFloat(item.cost_price || 0)), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div class="stat-box">
                <h4>Total Parent Inventory Value</h4>
                <p>Rs. ${stockData.reduce((total, item) => total + (parseInt(item.total_stock || 0) * parseFloat(item.recommended_price || 0)), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          ` : reportType === 'Sold Stock' ? `
            <div class="stats">
              <div class="stat-box">
                <h4>Total Sold Parts</h4>
                <p>${stockData.length} parts</p>
              </div>
              <div class="stat-box">
                <h4>Total Sold Quantity</h4>
                <p>${stockData.reduce((total, item) => total + parseInt(item.sold_stock || 0), 0)} units</p>
              </div>
              <div class="stat-box">
                <h4>Total Cost</h4>
                <p>Rs. ${stockData.reduce((total, item) => total + parseFloat(item.total_cost || 0), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div class="stat-box">
                <h4>Total Revenue</h4>
                <p>Rs. ${stockData.reduce((total, item) => total + (parseInt(item.sold_stock || 0) * parseFloat(item.sold_price || 0)), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          ` : reportType === 'Comprehensive Stock Report' ? `
            <div class="stats">
              <div class="stat-box">
                <h4>Total Parts</h4>
                <p>${stockData.length} parts</p>
              </div>
              <div class="stat-box">
                <h4>Available Stock</h4>
                <p>${stockData.reduce((total, item) => total + parseInt(item.available_stock || 0), 0)} units</p>
              </div>
              <div class="stat-box">
                <h4>Sold Stock</h4>
                <p>${stockData.reduce((total, item) => total + parseInt(item.sold_stock || 0), 0)} units</p>
              </div>
              <div class="stat-box">
                <h4>Total Inventory Cost</h4>
                <p>Rs. ${stockData.reduce((total, item) => total + (parseInt(item.total_stock || 0) * parseFloat(item.cost_price || 0)), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div class="stat-box">
                <h4>Total Inventory Value</h4>
                <p>Rs. ${stockData.reduce((total, item) => total + (parseInt(item.total_stock || 0) * parseFloat(item.recommended_price || 0)), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          ` : ''}
          <table class="stock-table">
            <thead>
              <tr>
                ${reportType === 'Parent-Child Relationships' ? `
                  <th>Parent ID</th>
                  <th>Parent Name</th>
                  <th>Parent Part No.</th>
                  <th>Parent Manufacturer</th>
                  <th>Parent Stock</th>
                  <th>Child ID</th>
                  <th>Child Name</th>
                  <th>Child Part No.</th>
                  <th>Child Manufacturer</th>
                  <th>Child Status</th>
                  <th>Child Available Qty</th>
                  <th>Child Reserved Qty</th>
                  <th>Child Sold Qty</th>
                  <th>Child Total Stock</th>
                  <th>Child Price (Rs.)</th>
                ` : reportType === 'Parent Parts' ? `
                  <th>Parent ID</th>
                  <th>Parent Name</th>
                  <th>Manufacturer</th>
                  <th>Part Number</th>
                  <th>Container No.</th>
                  <th>Purchase Type</th>
                  <th>Children Count</th>
                  <th>Parent Stock</th>
                  <th>Total Children Stock</th>
                  <th>Children Available</th>
                  <th>Children Reserved</th>
                  <th>Children Sold</th>
                  <th>Cost Price (Rs.)</th>
                  <th>Unit Price (Rs.)</th>
                  <th>Total Cost (Rs.)</th>
                  <th>Total Value (Rs.)</th>
                ` : `
                <th>ID</th>
                <th>Name</th>
                <th>Manufacturer</th>
                ${reportType === 'Available Stock' ? `
                  <th>Part Number</th>
                  <th>Available Qty</th>
                  <th>Reserved Qty</th>
                  <th>Total Stock</th>
                  <th>Container No.</th>
                  <th>Cost Price (Rs.)</th>
                  <th>Total Cost (Rs.)</th>
                  <th>Unit Price (Rs.)</th>
                  <th>Total Value (Rs.)</th>
                ` : reportType === 'Comprehensive Stock Report' ? `
                  <th>Part Number</th>
                  <th>Available Qty</th>
                  <th>Reserved Qty</th>
                  <th>Sold Qty</th>
                  <th>Total Stock</th>
                  <th>Container No.</th>
                  <th>Purchase Type</th>
                  <th>Cost Price (Rs.)</th>
                  <th>Total Cost (Rs.)</th>
                  <th>Unit Price (Rs.)</th>
                  <th>Total Value (Rs.)</th>
                ` : `
                  <th>Sold Qty</th>
                  <th>Total Stock</th>
                  <th>Sold Date</th>
                  <th>Cost Price (Rs.)</th>
                  <th>Unit Price (Rs.)</th>
                  <th>Total Cost (Rs.)</th>
                  <th>Total Revenue (Rs.)</th>
                  <th>Source</th>
                  <th>Container No.</th>
                  ${includeProfit ? '<th>Profit Margin</th>' : ''}
                `}
                `}
              </tr>
            </thead>
            <tbody>
              ${stockData.map(item => `
                <tr>
                  ${reportType === 'Parent-Child Relationships' ? `
                    <td>${item.parentId}</td>
                    <td>${item.parentName}</td>
                    <td>${item.parentPartNumber || 'N/A'}</td>
                    <td>${item.parentManufacturer || 'N/A'}</td>
                    <td>${item.parentTotalStock || 0}</td>
                    <td>${item.childId}</td>
                    <td>${item.childName}</td>
                    <td>${item.childPartNumber || 'N/A'}</td>
                    <td>${item.childManufacturer || 'N/A'}</td>
                    <td>${item.childStatus || 'N/A'}</td>
                    <td>${item.childAvailableStock || 0}</td>
                    <td>${item.childReservedStock || 0}</td>
                    <td>${item.childSoldStock || 0}</td>
                    <td>${item.childTotalStock || 0}</td>
                    <td>Rs. ${parseFloat(item.childRecommendedPrice || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  ` : reportType === 'Parent Parts' ? `
                    <td>${item.id}</td>
                    <td>${item.name}</td>
                    <td>${item.manufacturer || 'N/A'}</td>
                    <td>${item.part_number || 'N/A'}</td>
                    <td>${item.container_no || 'N/A'}</td>
                    <td>${item.local_purchase ? 'Local Purchase' : 'Container Purchase'}</td>
                    <td>${item.children_count || 0}</td>
                    <td>${item.total_stock || 0}</td>
                    <td>${item.total_children_stock || 0}</td>
                    <td>${item.total_children_available || 0}</td>
                    <td>${item.total_children_reserved || 0}</td>
                    <td>${item.total_children_sold || 0}</td>
                    <td>Rs. ${parseFloat(item.cost_price || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>Rs. ${parseFloat(item.recommended_price || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>Rs. ${(parseInt(item.total_stock || 0) * parseFloat(item.cost_price || 0)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>Rs. ${(parseInt(item.total_stock || 0) * parseFloat(item.recommended_price || 0)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  ` : `
                    <td>${item.id}</td>
                    <td>${item.name}</td>
                    <td>${item.manufacturer || 'N/A'}</td>
                    ${reportType === 'Available Stock' ? `
                      <td>${item.part_number || 'N/A'}</td>
                      <td>${item.available_stock || 0}</td>
                      <td>${item.reserved_stock || 0}</td>
                      <td>${item.total_stock || 0}</td>
                      <td>${item.container_no || 'N/A'}</td>
                      <td>Rs. ${parseFloat(item.cost_price || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>Rs. ${((parseInt(item.available_stock || 0) + parseInt(item.reserved_stock || 0)) * parseFloat(item.cost_price || 0)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>Rs. ${parseFloat(item.recommended_price || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>Rs. ${((parseInt(item.available_stock || 0) + parseInt(item.reserved_stock || 0)) * parseFloat(item.recommended_price || 0)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    ` : reportType === 'Comprehensive Stock Report' ? `
                      <td>${item.part_number || 'N/A'}</td>
                      <td>${item.available_stock || 0}</td>
                      <td>${item.reserved_stock || 0}</td>
                      <td>${item.sold_stock || 0}</td>
                      <td>${item.total_stock || 0}</td>
                      <td>${item.container_no || 'N/A'}</td>
                      <td>${item.local_purchase ? 'Local Purchase' : 'Container Purchase'}</td>
                      <td>Rs. ${parseFloat(item.cost_price || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>Rs. ${(parseInt(item.total_stock || 0) * parseFloat(item.cost_price || 0)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>Rs. ${parseFloat(item.recommended_price || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>Rs. ${(parseInt(item.total_stock || 0) * parseFloat(item.recommended_price || 0)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    ` : `
                      <td>${item.sold_stock || 0}</td>
                      <td>${item.total_stock || 0}</td>
                      <td>${item.sold_date ? new Date(item.sold_date).toLocaleDateString() : 'N/A'}</td>
                      <td>Rs. ${parseFloat(item.cost_price || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>Rs. ${parseFloat(item.sold_price || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>Rs. ${parseFloat(item.total_cost || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>Rs. ${(parseInt(item.sold_stock || 0) * parseFloat(item.sold_price || 0)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>${item.local_purchase ? 'Local Purchase' : 'Container Purchase'}</td>
                      <td>${item.container_no || 'N/A'}</td>
                      ${includeProfit ? `<td>${item.profit_margin || 'N/A'}</td>` : ''}
                    `}
                  `}
                </tr>
              `).join('')}
            </tbody>
          </table>
          <button onclick="window.print()">Print Report</button>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleGetAvailableStock = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(API_ENDPOINTS.PARTS, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch parts');
      }
      const data = await res.json();
      
      // Filter parts that have available stock > 0
      let available = data.filter(part => parseInt(part.available_stock || 0) > 0);
      
      // Extract and update available containers from current available stock data
      const availableContainerNumbers = [...new Set(
        available
          .filter(part => 
            part.container_no && 
            part.container_no.trim() !== '' &&
            part.local_purchase === false
          )
          .map(part => part.container_no)
      )].sort();
      
      setAvailableContainers(availableContainerNumbers);
      
      // Apply Purchase Type filter
      if (availableLocalPurchaseFilter !== '') {
        const isLocalPurchase = availableLocalPurchaseFilter === 'true';
        available = available.filter(part => {
          const partIsLocal = part.local_purchase === true || part.local_purchase === 'true';
          return partIsLocal === isLocalPurchase;
        });
      }
      
      // Apply Container Number filter
      if (availableContainerNo) {
        available = available.filter(part => part.container_no === availableContainerNo);
      }
      
      setAvailableStock(available);
      setShowAvailableStock(true);
      const totalQuantity = available.reduce((total, item) => total + parseInt(item.available_stock || 0), 0);
      setSuccess(`Found ${available.length} parts with ${totalQuantity} units available in stock.`);
    } catch (err) {
      console.error('Error fetching available stock:', err);
      setError('Failed to retrieve available stock.');
    } finally {
      setLoading(false);
    }
  };

  const handleGetSoldStock = async (isAutoRefresh = false) => {
    if (isAutoRefresh) {
      setAutoRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    if (!isAutoRefresh) setSuccess('');
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (startDate) params.append('from_date', startDate);
      if (endDate) params.append('to_date', endDate);
      if (containerNo) params.append('container_no', containerNo);
      if (localPurchaseFilter !== '') params.append('local_purchase', localPurchaseFilter);
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      // Fetch detailed report
      const reportRes = await fetch(`${API_ENDPOINTS.BASE_URL}/sold-stock-report?${params}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      
      if (!reportRes.ok) {
        throw new Error('Failed to fetch sold stock report');
      }
      
      const reportData = await reportRes.json();
      setSoldStockData(reportData);
      
      // Fetch summary data
      const summaryParams = new URLSearchParams();
      if (startDate) summaryParams.append('from_date', startDate);
      if (endDate) summaryParams.append('to_date', endDate);
      if (containerNo) summaryParams.append('container_no', containerNo);
      if (localPurchaseFilter !== '') summaryParams.append('local_purchase', localPurchaseFilter);
      
      const summaryRes = await fetch(`${API_ENDPOINTS.BASE_URL}/sold-stock-summary?${summaryParams}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSoldStockSummary(summaryData);
      }
      
      // Update legacy soldStock for compatibility with existing print function
      setSoldStock(reportData.sold_parts.map(item => ({
        id: item.part_id,
        name: item.part_name,
        manufacturer: item.manufacturer,
        part_number: item.part_number,
        sold_stock: item.sales_summary ? item.sales_summary.total_sold_quantity : 0,
        cost_price: item.cost_price,
        sold_price: item.sales_summary ? item.sales_summary.average_selling_price : 0,
        total_cost: (item.cost_price && item.sales_summary) ? (item.cost_price * item.sales_summary.total_sold_quantity) : null,
        total_revenue: item.sales_summary ? item.sales_summary.total_revenue : 0,
        sold_date: item.sales_summary ? item.sales_summary.last_sale_date : null,
        bill_number: '', // Not available in new structure
        customer_name: '', // Not available in new structure
        container_no: item.container_no,
        local_purchase: item.local_purchase,
        profit_margin: item.sales_summary ? item.sales_summary.average_profit_margin_percent : null
      })));
      
      setShowSoldStock(true);
      if (!isAutoRefresh && reportData.summary) {
        setSuccess(`Found ${reportData.summary.unique_parts_sold || 0} unique parts sold. Total net revenue: Rs ${(reportData.summary.total_revenue || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`);
      }
      
    } catch (err) {
      console.error('Error fetching sold stock:', err);
      setError('Failed to retrieve sold stock report.');
    } finally {
      setLoading(false);
      setAutoRefreshing(false);
    }
  };

  // Function to load available containers for the dropdown
  const loadAvailableContainers = async () => {
    try {
      // Load ALL containers from parts table (not just sold stock containers)
      const res = await fetch(API_ENDPOINTS.PARTS, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      if (res.ok) {
        const parts = await res.json();
        // Get all unique container numbers from all parts
        const containers = [...new Set(parts
          .map(part => part.container_no)
          .filter(container => container && container.trim() !== '')
        )].sort();
        setAvailableContainers(containers);
      }
    } catch (err) {
      console.error('Error loading containers:', err);
    }
  };

  // Load containers on component mount
  React.useEffect(() => {
    loadAvailableContainers();
  }, []);

  // Auto-dismiss success and error messages after 5 seconds
  React.useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Auto-refresh sold stock report when filters change
  React.useEffect(() => {
    // Only auto-refresh if we already have sold stock data and filters are applied
    if (soldStockData && (startDate || endDate || localPurchaseFilter !== '' || containerNo)) {
      const refreshTimer = setTimeout(() => {
        handleGetSoldStock(true); // Pass true to indicate auto-refresh
      }, 500); // Debounce to avoid too many requests

      return () => clearTimeout(refreshTimer);
    }
  }, [startDate, endDate, localPurchaseFilter, containerNo]);

  // Handle pagination changes separately
  React.useEffect(() => {
    // Only refresh when page changes and we have sold stock data
    if (soldStockData && currentPage !== soldStockData.pagination.page) {
      handleGetSoldStock(false);
    }
  }, [currentPage]);

  // Auto-refresh available stock when filters change
  React.useEffect(() => {
    // Only auto-refresh if we already have available stock data and filters are applied
    if (availableStock.length > 0 && (availableLocalPurchaseFilter !== '' || availableContainerNo)) {
      const refreshTimer = setTimeout(() => {
        handleGetAvailableStock();
      }, 500); // Debounce to avoid too many requests

      return () => clearTimeout(refreshTimer);
    }
  }, [availableLocalPurchaseFilter, availableContainerNo]);

  // Auto-refresh parent parts when filters change
  useEffect(() => {
    // Only auto-refresh if we already have parent parts data and filters are applied
    if (parentParts.length > 0 && (parentLocalPurchaseFilter !== '' || parentContainerNo)) {
      const refreshTimer = setTimeout(() => {
        handleGetParentParts();
      }, 500); // Debounce to avoid too many requests

      return () => clearTimeout(refreshTimer);
    }
  }, [parentLocalPurchaseFilter, parentContainerNo]);

  // Auto-refresh comprehensive stock when filters change
  useEffect(() => {
    // Only auto-refresh if we already have comprehensive stock data and filters are applied
    if (comprehensiveStock.length > 0 && (comprehensiveLocalPurchaseFilter !== '' || comprehensiveContainerNo)) {
      const refreshTimer = setTimeout(() => {
        handleGetComprehensiveStock();
      }, 500); // Debounce to avoid too many requests

      return () => clearTimeout(refreshTimer);
    }
  }, [comprehensiveLocalPurchaseFilter, comprehensiveContainerNo]);

  const handleGetParentChildRelations = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(API_ENDPOINTS.PARTS, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch parts');
      }
      const data = await res.json();
      
      // Create a map of parent ID to parent part details
      const parentMap = {};
      data.forEach(part => {
        parentMap[part.id] = part;
      });
      
        // Find all parts that have parent_id (child parts) and match with their parents
        const relations = [];
        data.forEach(part => {
          if (part.parent_id && parentMap[part.parent_id]) {
            relations.push({
              parentId: part.parent_id,
              parentName: parentMap[part.parent_id].name,
              parentManufacturer: parentMap[part.parent_id].manufacturer,
              parentPartNumber: parentMap[part.parent_id].part_number,
              parentStatus: parentMap[part.parent_id].stock_status,
              parentAvailableStock: parentMap[part.parent_id].available_stock,
              parentTotalStock: parentMap[part.parent_id].total_stock,
              childId: part.id,
              childName: part.name,
              childManufacturer: part.manufacturer,
              childPartNumber: part.part_number,
              childStatus: part.stock_status,
              childAvailableStock: part.available_stock,
              childReservedStock: part.reserved_stock,
              childSoldStock: part.sold_stock,
              childTotalStock: part.total_stock,
              childRecommendedPrice: part.recommended_price,
              childAvailableFrom: part.available_from,
              childSoldDate: part.sold_date
            });
          }
        });      // Sort by parent ID, then by child ID
      relations.sort((a, b) => {
        if (a.parentId !== b.parentId) {
          return a.parentId - b.parentId;
        }
        return a.childId - b.childId;
      });
      
      setParentChildRelations(relations);
      setShowParentChildRelations(true);
      setSuccess(`Found ${relations.length} parent-child relationships.`);
    } catch (err) {
      console.error('Error fetching parent-child relations:', err);
      setError('Failed to retrieve parent-child relationships.');
    } finally {
      setLoading(false);
    }
  };

  const handleGetParentParts = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(API_ENDPOINTS.PARTS, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch parts');
      }
      const data = await res.json();
      
      // Filter to get only parent parts (parts that have children)
      const allParts = data;
      const parentIds = new Set();
      
      // First, identify all parent IDs
      allParts.forEach(part => {
        if (part.parent_id) {
          parentIds.add(part.parent_id);
        }
      });
      
      // Then, get all parent parts and calculate their statistics
      let parentParts = allParts.filter(part => parentIds.has(part.id));
      
      // Apply filters
      if (parentContainerNo) {
        parentParts = parentParts.filter(part => 
          part.container_no && part.container_no.includes(parentContainerNo)
        );
      }
      
      if (parentLocalPurchaseFilter !== '') {
        const isLocal = parentLocalPurchaseFilter === 'true';
        parentParts = parentParts.filter(part => part.local_purchase === isLocal);
      }
      
      // Add child count and statistics to each parent
      const enhancedParentParts = parentParts.map(parent => {
        const children = allParts.filter(part => part.parent_id === parent.id);
        const totalChildrenStock = children.reduce((sum, child) => sum + parseInt(child.total_stock || 0), 0);
        const totalChildrenAvailable = children.reduce((sum, child) => sum + parseInt(child.available_stock || 0), 0);
        const totalChildrenReserved = children.reduce((sum, child) => sum + parseInt(child.reserved_stock || 0), 0);
        const totalChildrenSold = children.reduce((sum, child) => sum + parseInt(child.sold_stock || 0), 0);
        
        return {
          ...parent,
          children_count: children.length,
          total_children_stock: totalChildrenStock,
          total_children_available: totalChildrenAvailable,
          total_children_reserved: totalChildrenReserved,
          total_children_sold: totalChildrenSold
        };
      });
      
      setParentParts(enhancedParentParts);
      setShowParentParts(true);
      setSuccess(`Found ${enhancedParentParts.length} parent parts with ${Array.from(parentIds).length} total children.`);
    } catch (err) {
      console.error('Error fetching parent parts:', err);
      setError('Failed to retrieve parent parts.');
    } finally {
      setLoading(false);
    }
  };

  const handleGetComprehensiveStock = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(API_ENDPOINTS.PARTS, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch parts');
      }
      const data = await res.json();
      
      // Apply filters
      let filteredData = data;
      
      if (comprehensiveContainerNo) {
        filteredData = filteredData.filter(part => 
          part.container_no && part.container_no.includes(comprehensiveContainerNo)
        );
      }
      
      if (comprehensiveLocalPurchaseFilter !== '') {
        const isLocal = comprehensiveLocalPurchaseFilter === 'true';
        filteredData = filteredData.filter(part => part.local_purchase === isLocal);
      }
      
      setComprehensiveStock(filteredData);
      setShowComprehensiveStock(true);
      setSuccess(`Found ${filteredData.length} parts matching criteria.`);
    } catch (err) {
      console.error('Error fetching comprehensive stock:', err);
      setError('Failed to retrieve comprehensive stock report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid px-2 px-md-4">
      <div className="card p-2 p-md-4 mt-4 shadow-sm">
        <h2 className="mb-3 fs-4 fs-md-2">Reports</h2>
        
        {loading && <div className="alert alert-info">Loading...</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Available Stock Section */}
        <div className="card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h4>Available Stock</h4>
            {availableStock.length > 0 && (
              <button 
                className="btn btn-outline-secondary btn-sm" 
                onClick={() => setShowAvailableStock(!showAvailableStock)}
              >
                {showAvailableStock ? 'Hide Report' : 'Show Report'}
              </button>
            )}
          </div>
          <div className="card-body">
            {/* Filter Section for Available Stock */}
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="form-label">Purchase Type:</label>
                <select
                  className="form-control"
                  value={availableLocalPurchaseFilter}
                  onChange={(e) => {
                    setAvailableLocalPurchaseFilter(e.target.value);
                    // Reset container filter when purchase type changes
                    if (e.target.value !== 'false') {
                      setAvailableContainerNo('');
                    }
                  }}
                >
                  <option value="">All Types</option>
                  <option value="true">Local Purchase</option>
                  <option value="false">Container Purchase</option>
                </select>
                <small className="text-muted">Filter by source</small>
              </div>
              {/* Conditionally show Container Number filter only for Container Purchase */}
              {availableLocalPurchaseFilter === 'false' && (
                <div className="col-md-6">
                  <label className="form-label">Container Number:</label>
                  <select
                    className="form-control"
                    value={availableContainerNo}
                    onChange={(e) => setAvailableContainerNo(e.target.value)}
                  >
                    <option value="">All Containers</option>
                    {availableContainers.map(container => (
                      <option key={container} value={container}>{container}</option>
                    ))}
                  </select>
                  <small className="text-muted">Filter by container</small>
                </div>
              )}
            </div>

            <div className="d-flex gap-2 mb-3">
              <button className="btn btn-primary" onClick={handleGetAvailableStock}>
                Get Available Stock
              </button>
              {availableStock.length > 0 && (
                <button 
                  className="btn btn-success" 
                  onClick={() => printStockReport(availableStock, 'Available Stock')}
                >
                  Print Available Stock Report
                </button>
              )}
            </div>

            {availableStock.length > 0 && showAvailableStock && (
              <div className="table-responsive">
                <table className="table table-bordered table-striped align-middle text-nowrap fs-6">
                  <thead className="table-dark">
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Manufacturer</th>
                      <th>Part Number</th>
                      <th>Available Qty</th>
                      <th>Reserved Qty</th>
                      <th>Total Stock</th>
                      <th>Container No.</th>
                      <th>Cost Price (Rs.)</th>
                      <th>Total Cost (Rs.)</th>
                      <th>Unit Price (Rs.)</th>
                      <th>Total Value (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableStock.map(part => (
                      <tr key={part.id}>
                        <td>{part.id}</td>
                        <td>{part.name}</td>
                        <td>{part.manufacturer}</td>
                        <td>{part.part_number || 'N/A'}</td>
                        <td><span className="badge bg-success">{part.available_stock || 0}</span></td>
                        <td><span className="badge bg-warning">{part.reserved_stock || 0}</span></td>
                        <td><span className="badge bg-info">{part.total_stock || 0}</span></td>
                        <td>{part.container_no || 'N/A'}</td>
                        <td>{
                          part.cost_price !== null && part.cost_price !== undefined
                            ? `Rs. ${parseFloat(part.cost_price).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                            : 'N/A'
                        }</td>
                        <td><strong>{
                          part.cost_price !== null && part.cost_price !== undefined
                            ? `Rs. ${((parseInt(part.available_stock || 0) + parseInt(part.reserved_stock || 0)) * parseFloat(part.cost_price)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                            : 'N/A'
                        }</strong></td>
                        <td>{
                          part.recommended_price !== null && part.recommended_price !== undefined
                            ? `Rs. ${parseFloat(part.recommended_price).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                            : 'N/A'
                        }</td>
                        <td><strong>{
                          part.recommended_price !== null && part.recommended_price !== undefined
                            ? `Rs. ${((parseInt(part.available_stock || 0) + parseInt(part.reserved_stock || 0)) * parseFloat(part.recommended_price)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                            : 'N/A'
                        }</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3">
                  <strong>Summary:</strong>
                  <ul>
                    <li>Total Available Parts: {availableStock.length}</li>
                    <li>Total Available Quantity: <span className="badge bg-success">{availableStock.reduce((total, item) => total + parseInt(item.available_stock || 0), 0)} units</span></li>
                    <li>Total Reserved Quantity: <span className="badge bg-warning">{availableStock.reduce((total, item) => total + parseInt(item.reserved_stock || 0), 0)} units</span></li>
                    <li>Total Stock Quantity: <span className="badge bg-info">{availableStock.reduce((total, item) => total + parseInt(item.total_stock || 0), 0)} units</span></li>
                    <li>Total Inventory Cost: <strong>Rs. {availableStock.reduce((total, item) => total + ((parseInt(item.available_stock || 0) + parseInt(item.reserved_stock || 0)) * parseFloat(item.cost_price || 0)), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</strong></li>
                    <li>Total Inventory Value: <strong>Rs. {availableStock.reduce((total, item) => total + ((parseInt(item.available_stock || 0) + parseInt(item.reserved_stock || 0)) * parseFloat(item.recommended_price || 0)), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</strong></li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sold Stock Section */}
        <div className="card mb-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h4>Sold Stock Report</h4>
            {soldStock.length > 0 && (
              <button 
                className="btn btn-outline-secondary btn-sm" 
                onClick={() => setShowSoldStock(!showSoldStock)}
              >
                {showSoldStock ? 'Hide Report' : 'Show Report'}
              </button>
            )}
          </div>
          <div className="card-body">
            {/* Enhanced Filter Section */}
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <label className="form-label">Start Date:</label>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <small className="text-muted">Optional</small>
              </div>
              <div className="col-md-3">
                <label className="form-label">End Date:</label>
                <input
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <small className="text-muted">Optional</small>
              </div>
              <div className="col-md-3">
                <label className="form-label">Purchase Type:</label>
                <select
                  className="form-control"
                  value={localPurchaseFilter}
                  onChange={(e) => {
                    setLocalPurchaseFilter(e.target.value);
                    // Reset container filter when purchase type changes
                    if (e.target.value !== 'false') {
                      setContainerNo('');
                    }
                  }}
                >
                  <option value="">All Types</option>
                  <option value="true">Local Purchase</option>
                  <option value="false">Container Purchase</option>
                </select>
                <small className="text-muted">Filter by source</small>
              </div>
              {/* Conditionally show Container Number filter only for Container Purchase */}
              {localPurchaseFilter === 'false' && (
                <div className="col-md-3">
                  <label className="form-label">Container Number:</label>
                  <select
                    className="form-control"
                    value={containerNo}
                    onChange={(e) => setContainerNo(e.target.value)}
                  >
                    <option value="">All Containers</option>
                    {availableContainers.map(container => (
                      <option key={container} value={container}>{container}</option>
                    ))}
                  </select>
                  <small className="text-muted">Filter by container</small>
                </div>
              )}
            </div>

            <div className="d-flex gap-2 mb-3 align-items-center">
              <button 
                className="btn btn-primary" 
                onClick={() => handleGetSoldStock(false)}
                disabled={loading || autoRefreshing}
              >
                {loading ? 'Loading...' : 'Get Sold Stock Report'}
              </button>
              {soldStock.length > 0 && (
                <button 
                  className="btn btn-success" 
                  onClick={() => printStockReport(soldStock, 'Sold Stock', startDate && endDate ? `${startDate} to ${endDate}` : 'All dates', userRole === 'admin' || userRole === 'superadmin')}
                >
                  Print Report
                </button>
              )}
              {autoRefreshing && (
                <div className="d-flex align-items-center text-muted">
                  <div className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">Auto-refreshing...</span>
                  </div>
                  <small>Auto-refreshing...</small>
                </div>
              )}
            </div>

            {/* Enhanced Table */}
            {soldStock.length > 0 && showSoldStock && (
              <div className="table-responsive">
                <table className="table table-bordered table-striped align-middle text-nowrap fs-6">
                  <thead className="table-dark">
                    <tr>
                      <th>Part Details</th>
                      <th>Part Number</th>
                      <th>Qty Sold</th>
                      <th>Cost Price</th>
                      <th>Unit Price</th>
                      <th>Total Cost</th>
                      <th>Total Revenue</th>
                      <th>Source</th>
                      <th>Container</th>
                      {(userRole === 'admin' || userRole === 'superadmin') && <th>Profit Margin</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {soldStock.map((item, index) => (
                      <tr key={`${item.id}-${index}`}>
                        <td>
                          <div>
                            <strong>{item.name}</strong><br />
                            <small className="text-muted">{item.manufacturer}</small>
                          </div>
                        </td>
                        <td>{item.part_number || 'N/A'}</td>
                        <td><span className="badge bg-danger">{item.sold_stock}</span></td>
                        <td>
                          {item.cost_price !== null && item.cost_price !== undefined 
                            ? `Rs ${parseFloat(item.cost_price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}` 
                            : 'N/A'
                          }
                        </td>
                        <td>Rs {parseFloat(item.sold_price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                        <td>
                          <strong>
                            {item.total_cost !== null && item.total_cost !== undefined 
                              ? `Rs ${parseFloat(item.total_cost).toLocaleString('en-LK', { minimumFractionDigits: 2 })}` 
                              : 'N/A'
                            }
                          </strong>
                        </td>
                        <td><strong>Rs {parseFloat(item.total_revenue).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong></td>
                        <td>
                          <span className={`badge ${item.local_purchase ? 'bg-warning text-dark' : 'bg-info'}`}>
                            {item.local_purchase ? 'Local' : 'Container'}
                          </span>
                        </td>
                        <td>{item.container_no || 'N/A'}</td>
                        {(userRole === 'admin' || userRole === 'superadmin') && (
                          <td>
                            {item.profit_margin ? (
                              <span className="badge bg-success">{item.profit_margin}%</span>
                            ) : (
                              <span className="text-muted">N/A</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {soldStockData && soldStockData.pagination && soldStockData.pagination.pages > 1 && (
                  <nav>
                    <ul className="pagination justify-content-center">
                      <li className={`page-item ${!soldStockData.pagination.hasPreviousPage ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => {
                            setCurrentPage(currentPage - 1);
                          }}
                          disabled={!soldStockData.pagination.hasPreviousPage}
                        >
                          Previous
                        </button>
                      </li>
                      <li className="page-item active">
                        <span className="page-link">
                          Page {soldStockData.pagination.page} of {soldStockData.pagination.pages}
                        </span>
                      </li>
                      <li className={`page-item ${!soldStockData.pagination.hasNextPage ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => {
                            setCurrentPage(currentPage + 1);
                          }}
                          disabled={!soldStockData.pagination.hasNextPage}
                        >
                          Next
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}

                {/* Enhanced Summary */}
                <div className="mt-4">
                  <div className="row">
                    <div className="col-md-6">
                      <h5>Report Summary</h5>
                      <ul className="list-unstyled">
                        <li><strong>Number of Parts Displayed on this page:</strong> {soldStock.length}</li>
                        <li><strong>Sold Quantity Displayed on this page:</strong> {soldStock.reduce((total, item) => total + parseInt(item.sold_stock || 0), 0)} units</li>
                        <li><strong>Total Cost of Items Displayed on this page:</strong> Rs {soldStock.reduce((total, item) => total + parseFloat(item.total_cost || 0), 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</li>
                        <li><strong>Revenue of Items Displayed on this page:</strong>Rs {soldStock.reduce((total, item) => total + parseFloat(item.total_revenue || 0), 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</li>
                        {soldStockData && soldStockData.summary && (
                          <>
                            <li><strong>Total Cost of the search:</strong> Rs {(soldStockData.summary.total_cost || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</li>
                            <li><strong>Total Local Purchase Revenue of the search:</strong> Rs {(soldStockData.summary.local_purchase_revenue || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</li>
                            <li><strong>Total Container Purchase Revenue of the search:</strong> Rs {(soldStockData.summary.container_revenue || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</li>
                            <li><strong>Total Net Revenue of the search:</strong> Rs {(soldStockData.summary.total_revenue || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</li>
                            <li><strong>Total Net Profit of the search:</strong> Rs {(soldStockData.summary.total_profit || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</li>
                          </>
                        )}
                      </ul>
                    </div>
                    {soldStockSummary && soldStockSummary.top_selling_parts.length > 0 && (
                      <div className="col-md-6">
                        <h5>Top Selling Parts</h5>
                        <div className="table-responsive">
                          <table className="table table-sm">
                            <thead>
                              <tr>
                                <th>Part</th>
                                <th>Sold</th>
                                <th>Revenue</th>
                              </tr>
                            </thead>
                            <tbody>
                              {soldStockSummary.top_selling_parts.slice(0, 5).map((part, index) => (
                                <tr key={index}>
                                  <td>
                                    <small>
                                      <strong>{part.name}</strong><br />
                                      {part.manufacturer}
                                    </small>
                                  </td>
                                  <td><span className="badge bg-primary">{part.total_sold}</span></td>
                                  <td>Rs {part.total_revenue.toLocaleString('en-LK')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Parent-Child Relationship Report Section */}
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h4>Parent-Child Relationship Report</h4>
            {parentChildRelations.length > 0 && (
              <button 
                className="btn btn-outline-secondary btn-sm" 
                onClick={() => setShowParentChildRelations(!showParentChildRelations)}
              >
                {showParentChildRelations ? 'Hide Report' : 'Show Report'}
              </button>
            )}
          </div>
          <div className="card-body">
            <div className="d-flex gap-2 mb-3">
              <button 
                className="btn btn-primary" 
                onClick={handleGetParentChildRelations}
                disabled={loading}
              >
                Generate Parent-Child Report
              </button>
              {parentChildRelations.length > 0 && (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => printStockReport(parentChildRelations, 'Parent-Child Relationships')}
                >
                  Print Report
                </button>
              )}
            </div>
            
            {parentChildRelations.length > 0 && showParentChildRelations && (
              <div className="table-responsive">
                <table className="table table-bordered table-striped align-middle text-nowrap fs-6">
                  <thead className="table-dark">
                    <tr>
                      <th>Parent ID</th>
                      <th>Parent Name</th>
                      <th>Parent Part No.</th>
                      <th>Parent Manufacturer</th>
                      <th>Parent Status</th>
                      <th>Parent Stock</th>
                      <th>Child ID</th>
                      <th>Child Name</th>
                      <th>Child Part No.</th>
                      <th>Child Manufacturer</th>
                      <th>Child Status</th>
                      <th>Child Available</th>
                      <th>Child Reserved</th>
                      <th>Child Sold</th>
                      <th>Child Total</th>
                      <th>Child Price (Rs.)</th>
                      <th>Child Available From</th>
                      <th>Child Sold Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parentChildRelations.map((relation, index) => (
                      <tr key={index}>
                        <td>{relation.parentId}</td>
                        <td>{relation.parentName}</td>
                        <td>{relation.parentPartNumber || 'N/A'}</td>
                        <td>{relation.parentManufacturer || 'N/A'}</td>
                        <td>
                          <span className={
                            relation.parentStatus === 'available' ? 'badge bg-success' :
                            relation.parentStatus === 'sold' ? 'badge bg-danger' :
                            relation.parentStatus === 'reserved' ? 'badge bg-warning text-dark' :
                            'badge bg-secondary'
                          }>
                            {relation.parentStatus ? relation.parentStatus.charAt(0).toUpperCase() + relation.parentStatus.slice(1) : 'N/A'}
                          </span>
                        </td>
                        <td>
                          <small>
                            A: <span className="badge bg-success">{relation.parentAvailableStock || 0}</span><br />
                            T: <span className="badge bg-info">{relation.parentTotalStock || 0}</span>
                          </small>
                        </td>
                        <td>{relation.childId}</td>
                        <td>{relation.childName}</td>
                        <td>{relation.childPartNumber || 'N/A'}</td>
                        <td>{relation.childManufacturer || 'N/A'}</td>
                        <td>
                          <span className={
                            relation.childStatus === 'available' ? 'badge bg-success' :
                            relation.childStatus === 'sold' ? 'badge bg-danger' :
                            relation.childStatus === 'reserved' ? 'badge bg-warning text-dark' :
                            'badge bg-secondary'
                          }>
                            {relation.childStatus ? relation.childStatus.charAt(0).toUpperCase() + relation.childStatus.slice(1) : 'N/A'}
                          </span>
                        </td>
                        <td><span className="badge bg-success">{relation.childAvailableStock || 0}</span></td>
                        <td><span className="badge bg-warning">{relation.childReservedStock || 0}</span></td>
                        <td><span className="badge bg-danger">{relation.childSoldStock || 0}</span></td>
                        <td><span className="badge bg-info">{relation.childTotalStock || 0}</span></td>
                        <td>{
                          relation.childRecommendedPrice !== null && relation.childRecommendedPrice !== undefined
                            ? `Rs. ${parseFloat(relation.childRecommendedPrice).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                            : 'N/A'
                        }</td>
                        <td>{relation.childAvailableFrom ? relation.childAvailableFrom.slice(0, 10) : 'N/A'}</td>
                        <td>{relation.childSoldDate ? relation.childSoldDate.slice(0, 10) : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3">
                  <strong>Summary:</strong>
                  <ul>
                    <li>Total Parent-Child Relationships: {parentChildRelations.length}</li>
                    <li>Unique Parent Parts: {new Set(parentChildRelations.map(r => r.parentId)).size}</li>
                    <li>Child Parts - Available: <span className="badge bg-success">{parentChildRelations.filter(r => r.childStatus === 'available').length}</span></li>
                    <li>Child Parts - Sold: <span className="badge bg-danger">{parentChildRelations.filter(r => r.childStatus === 'sold').length}</span></li>
                    <li>Child Parts - Reserved: <span className="badge bg-warning">{parentChildRelations.filter(r => r.childStatus === 'reserved').length}</span></li>
                    <li>Total Child Available Quantity: <span className="badge bg-success">{parentChildRelations.reduce((total, relation) => total + parseInt(relation.childAvailableStock || 0), 0)} units</span></li>
                    <li>Total Child Reserved Quantity: <span className="badge bg-warning">{parentChildRelations.reduce((total, relation) => total + parseInt(relation.childReservedStock || 0), 0)} units</span></li>
                    <li>Total Child Sold Quantity: <span className="badge bg-danger">{parentChildRelations.reduce((total, relation) => total + parseInt(relation.childSoldStock || 0), 0)} units</span></li>
                    <li>Total Value of Child Parts: Rs. {parentChildRelations.reduce((total, relation) => total + (parseInt(relation.childAvailableStock || 0) * parseFloat(relation.childRecommendedPrice || 0)), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Parent Parts Report Section */}
        <div className="card mt-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h4>Parent Parts Report</h4>
            {parentParts.length > 0 && (
              <button 
                className="btn btn-outline-secondary btn-sm" 
                onClick={() => setShowParentParts(!showParentParts)}
              >
                {showParentParts ? 'Hide Report' : 'Show Report'}
              </button>
            )}
          </div>
          <div className="card-body">
            {/* Filter Section for Parent Parts */}
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="form-label">Purchase Type:</label>
                <select
                  className="form-control"
                  value={parentLocalPurchaseFilter}
                  onChange={(e) => {
                    setParentLocalPurchaseFilter(e.target.value);
                    // Reset container filter when purchase type changes
                    if (e.target.value !== 'false') {
                      setParentContainerNo('');
                    }
                  }}
                >
                  <option value="">All Types</option>
                  <option value="true">Local Purchase</option>
                  <option value="false">Container Purchase</option>
                </select>
                <small className="text-muted">Filter by source</small>
              </div>
              {/* Conditionally show Container Number filter only for Container Purchase */}
              {parentLocalPurchaseFilter === 'false' && (
                <div className="col-md-6">
                  <label className="form-label">Container Number:</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter container number"
                    value={parentContainerNo}
                    onChange={(e) => setParentContainerNo(e.target.value)}
                  />
                  <small className="text-muted">Optional filter</small>
                </div>
              )}
            </div>

            <div className="d-flex gap-2 mb-3">
              <button 
                className="btn btn-primary" 
                onClick={handleGetParentParts}
                disabled={loading}
              >
                Generate Parent Parts Report
              </button>
              {parentParts.length > 0 && (
                <button 
                  className="btn btn-secondary" 
                  onClick={() => printStockReport(parentParts, 'Parent Parts')}
                >
                  Print Report
                </button>
              )}
            </div>
            
            {parentParts.length > 0 && showParentParts && (
              <div className="table-responsive">
                <table className="table table-bordered table-striped align-middle text-nowrap fs-6">
                  <thead className="table-dark">
                    <tr>
                      <th>Parent ID</th>
                      <th>Parent Name</th>
                      <th>Manufacturer</th>
                      <th>Part Number</th>
                      <th>Container No.</th>
                      <th>Purchase Type</th>
                      <th>Children Count</th>
                      <th>Parent Stock</th>
                      <th>Total Children Stock</th>
                      <th>Children Available</th>
                      <th>Children Reserved</th>
                      <th>Children Sold</th>
                      <th>Cost Price (Rs.)</th>
                      <th>Unit Price (Rs.)</th>
                      <th>Total Cost (Rs.)</th>
                      <th>Total Value (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parentParts.map(parent => (
                      <tr key={parent.id}>
                        <td>{parent.id}</td>
                        <td>
                          <div>
                            <strong>{parent.name}</strong><br />
                            <small className="text-muted">{parent.manufacturer}</small>
                          </div>
                        </td>
                        <td>{parent.manufacturer}</td>
                        <td>{parent.part_number || 'N/A'}</td>
                        <td>{parent.container_no || 'N/A'}</td>
                        <td>
                          <span className={`badge ${parent.local_purchase ? 'bg-warning text-dark' : 'bg-info'}`}>
                            {parent.local_purchase ? 'Local' : 'Container'}
                          </span>
                        </td>
                        <td><span className="badge bg-primary">{parent.children_count}</span></td>
                        <td><span className="badge bg-info">{parent.total_stock || 0}</span></td>
                        <td><span className="badge bg-info">{parent.total_children_stock}</span></td>
                        <td><span className="badge bg-success">{parent.total_children_available}</span></td>
                        <td><span className="badge bg-warning">{parent.total_children_reserved}</span></td>
                        <td><span className="badge bg-danger">{parent.total_children_sold}</span></td>
                        <td>{
                          parent.cost_price !== null && parent.cost_price !== undefined
                            ? `Rs. ${parseFloat(parent.cost_price).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                            : 'N/A'
                        }</td>
                        <td>{
                          parent.recommended_price !== null && parent.recommended_price !== undefined
                            ? `Rs. ${parseFloat(parent.recommended_price).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                            : 'N/A'
                        }</td>
                        <td><strong>{
                          parent.cost_price !== null && parent.cost_price !== undefined
                            ? `Rs. ${(parseInt(parent.total_stock || 0) * parseFloat(parent.cost_price)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                            : 'N/A'
                        }</strong></td>
                        <td><strong>{
                          parent.recommended_price !== null && parent.recommended_price !== undefined
                            ? `Rs. ${(parseInt(parent.total_stock || 0) * parseFloat(parent.recommended_price)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                            : 'N/A'
                        }</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3">
                  <strong>Summary:</strong>
                  <ul>
                    <li>Total Parent Parts: {parentParts.length}</li>
                    <li>Total Children Parts: {parentParts.reduce((total, parent) => total + parent.children_count, 0)}</li>
                    <li>Parent Stock Quantity: <span className="badge bg-info">{parentParts.reduce((total, parent) => total + parseInt(parent.total_stock || 0), 0)} units</span></li>
                    <li>Children Available Quantity: <span className="badge bg-success">{parentParts.reduce((total, parent) => total + parent.total_children_available, 0)} units</span></li>
                    <li>Children Reserved Quantity: <span className="badge bg-warning">{parentParts.reduce((total, parent) => total + parent.total_children_reserved, 0)} units</span></li>
                    <li>Children Sold Quantity: <span className="badge bg-danger">{parentParts.reduce((total, parent) => total + parent.total_children_sold, 0)} units</span></li>
                    <li>Total Parent Inventory Cost: <strong>Rs. {parentParts.reduce((total, parent) => total + (parseInt(parent.total_stock || 0) * parseFloat(parent.cost_price || 0)), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</strong></li>
                    <li>Total Parent Inventory Value: <strong>Rs. {parentParts.reduce((total, parent) => total + (parseInt(parent.total_stock || 0) * parseFloat(parent.recommended_price || 0)), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</strong></li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comprehensive Stock Report Section */}
        <div className="card mt-4">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h4>Comprehensive Stock Report</h4>
            {comprehensiveStock.length > 0 && (
              <button 
                className="btn btn-outline-secondary btn-sm" 
                onClick={() => setShowComprehensiveStock(!showComprehensiveStock)}
              >
                {showComprehensiveStock ? 'Hide Report' : 'Show Report'}
              </button>
            )}
          </div>
          <div className="card-body">
            {/* Filter Section for Comprehensive Stock */}
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="form-label">Purchase Type:</label>
                <select
                  className="form-control"
                  value={comprehensiveLocalPurchaseFilter}
                  onChange={(e) => {
                    setComprehensiveLocalPurchaseFilter(e.target.value);
                    // Reset container filter when purchase type changes
                    if (e.target.value !== 'false') {
                      setComprehensiveContainerNo('');
                    }
                  }}
                >
                  <option value="">All Types</option>
                  <option value="true">Local Purchase</option>
                  <option value="false">Container Purchase</option>
                </select>
                <small className="text-muted">Filter by source</small>
              </div>
              {/* Conditionally show Container Number filter only for Container Purchase */}
              {comprehensiveLocalPurchaseFilter === 'false' && (
                <div className="col-md-6">
                  <label className="form-label">Container Number:</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter container number"
                    value={comprehensiveContainerNo}
                    onChange={(e) => setComprehensiveContainerNo(e.target.value)}
                  />
                  <small className="text-muted">Optional filter</small>
                </div>
              )}
            </div>

            <div className="d-flex gap-2 mb-3">
              <button 
                className="btn btn-primary" 
                onClick={handleGetComprehensiveStock}
                disabled={loading}
              >
                Generate Comprehensive Stock Report
              </button>
              {comprehensiveStock.length > 0 && (
                <button 
                  className="btn btn-success" 
                  onClick={() => printStockReport(comprehensiveStock, 'Comprehensive Stock Report')}
                >
                  Print Comprehensive Report
                </button>
              )}
            </div>

            {/* Enhanced Table */}
            {comprehensiveStock.length > 0 && showComprehensiveStock && (
              <div className="table-responsive">
                <table className="table table-bordered table-striped align-middle text-nowrap fs-6">
                  <thead className="table-dark">
                    <tr>
                      <th>Part Details</th>
                      <th>Part Number</th>
                      <th>Available Qty</th>
                      <th>Reserved Qty</th>
                      <th>Sold Qty</th>
                      <th>Total Stock</th>
                      <th>Purchase Type</th>
                      <th>Container</th>
                      <th>Cost Price (Rs.)</th>
                      <th>Total Cost (Rs.)</th>
                      <th>Unit Price (Rs.)</th>
                      <th>Total Value (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comprehensiveStock.map((item, index) => (
                      <tr key={`${item.id}-${index}`}>
                        <td>
                          <div>
                            <strong>{item.name}</strong><br />
                            <small className="text-muted">{item.manufacturer}</small>
                          </div>
                        </td>
                        <td>{item.part_number || 'N/A'}</td>
                        <td><span className="badge bg-success">{item.available_stock || 0}</span></td>
                        <td><span className="badge bg-warning text-dark">{item.reserved_stock || 0}</span></td>
                        <td><span className="badge bg-danger">{item.sold_stock || 0}</span></td>
                        <td><span className="badge bg-info">{item.total_stock || 0}</span></td>
                        <td>
                          <span className={`badge ${item.local_purchase ? 'bg-warning text-dark' : 'bg-info'}`}>
                            {item.local_purchase ? 'Local' : 'Container'}
                          </span>
                        </td>
                        <td>{item.container_no || 'N/A'}</td>
                        <td>
                          {item.cost_price !== null && item.cost_price !== undefined 
                            ? `Rs. ${parseFloat(item.cost_price).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}` 
                            : 'N/A'
                          }
                        </td>
                        <td><strong>
                          {item.cost_price !== null && item.cost_price !== undefined 
                            ? `Rs. ${(parseInt(item.total_stock || 0) * parseFloat(item.cost_price)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}` 
                            : 'N/A'
                          }
                        </strong></td>
                        <td>
                          {item.recommended_price !== null && item.recommended_price !== undefined
                            ? `Rs. ${parseFloat(item.recommended_price).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                            : 'N/A'
                          }
                        </td>
                        <td><strong>
                          {item.recommended_price !== null && item.recommended_price !== undefined
                            ? `Rs. ${(parseInt(item.total_stock || 0) * parseFloat(item.recommended_price)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                            : 'N/A'
                          }
                        </strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Summary */}
                <div className="mt-4">
                  <strong>Summary:</strong>
                  <ul>
                    <li>Total Parts: {comprehensiveStock.length}</li>
                    <li>Available Stock Quantity: <span className="badge bg-success">{comprehensiveStock.reduce((total, item) => total + parseInt(item.available_stock || 0), 0)} units</span></li>
                    <li>Reserved Stock Quantity: <span className="badge bg-warning text-dark">{comprehensiveStock.reduce((total, item) => total + parseInt(item.reserved_stock || 0), 0)} units</span></li>
                    <li>Sold Stock Quantity: <span className="badge bg-danger">{comprehensiveStock.reduce((total, item) => total + parseInt(item.sold_stock || 0), 0)} units</span></li>
                    <li>Total Inventory Cost: <strong>Rs. {comprehensiveStock.reduce((total, item) => total + (parseInt(item.total_stock || 0) * parseFloat(item.cost_price || 0)), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</strong></li>
                    <li>Total Inventory Value: <strong>Rs. {comprehensiveStock.reduce((total, item) => total + (parseInt(item.total_stock || 0) * parseFloat(item.recommended_price || 0)), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</strong></li>
                    <li>Local Purchase Items: <span className="badge bg-warning text-dark">{comprehensiveStock.filter(item => item.local_purchase).length}</span></li>
                    <li>Container Purchase Items: <span className="badge bg-info">{comprehensiveStock.filter(item => !item.local_purchase).length}</span></li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockManagement;

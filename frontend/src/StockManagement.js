import React, { useState } from 'react';
import { API_ENDPOINTS } from './config/api';

function StockManagement() {
  const [availableStock, setAvailableStock] = useState([]);
  const [soldStock, setSoldStock] = useState([]);
  const [parentChildRelations, setParentChildRelations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [token] = useState(localStorage.getItem('token') || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showSoldStock, setShowSoldStock] = useState(false);
  const [showAvailableStock, setShowAvailableStock] = useState(false);
  const [showParentChildRelations, setShowParentChildRelations] = useState(false);

  const printStockReport = (stockData, reportType, dateRange = null) => {
    const printContent = `
      <html>
        <head>
          <title>${reportType} Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .report-details { margin-bottom: 20px; }
            .stock-table { width: 100%; border-collapse: collapse; }
            .stock-table th, .stock-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .stock-table th { background-color: #f2f2f2; }
            .summary { margin-top: 20px; font-weight: bold; }
            @media print { button { display: none; } }
            .stats { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .stat-box { border: 1px solid #ddd; padding: 10px; margin: 5px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Rasuki Group</h1>
            <h2>${reportType} Report</h2>
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
                <h4>Total Inventory Value</h4>
                <p>Rs. ${stockData.reduce((total, item) => total + (parseInt(item.available_stock || 0) * parseFloat(item.recommended_price || 0)), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
                <h4>Total Revenue</h4>
                <p>Rs. ${stockData.reduce((total, item) => total + (parseInt(item.sold_stock || 0) * parseFloat(item.sold_price || 0)), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          ` : ''}
          <table class="stock-table">
            <thead>
              <tr>
                ${reportType === 'Parent-Child Relationships' ? `
                  <th>Parent ID</th>
                  <th>Parent Name</th>
                  <th>Parent Manufacturer</th>
                  <th>Parent Stock</th>
                  <th>Child ID</th>
                  <th>Child Name</th>
                  <th>Child Manufacturer</th>
                  <th>Child Status</th>
                  <th>Child Available Qty</th>
                  <th>Child Reserved Qty</th>
                  <th>Child Sold Qty</th>
                  <th>Child Total Stock</th>
                  <th>Child Price (Rs.)</th>
                ` : `
                <th>ID</th>
                <th>Name</th>
                <th>Manufacturer</th>
                ${reportType === 'Available Stock' ? `
                  <th>Available Qty</th>
                  <th>Reserved Qty</th>
                  <th>Total Stock</th>
                  <th>Available From</th>
                  <th>Unit Price (Rs.)</th>
                  <th>Total Value (Rs.)</th>
                ` : `
                  <th>Sold Qty</th>
                  <th>Total Stock</th>
                  <th>Sold Date</th>
                  <th>Unit Price (Rs.)</th>
                  <th>Total Revenue (Rs.)</th>
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
                    <td>${item.parentManufacturer || 'N/A'}</td>
                    <td>${item.parentTotalStock || 0}</td>
                    <td>${item.childId}</td>
                    <td>${item.childName}</td>
                    <td>${item.childManufacturer || 'N/A'}</td>
                    <td>${item.childStatus || 'N/A'}</td>
                    <td>${item.childAvailableStock || 0}</td>
                    <td>${item.childReservedStock || 0}</td>
                    <td>${item.childSoldStock || 0}</td>
                    <td>${item.childTotalStock || 0}</td>
                    <td>Rs. ${parseFloat(item.childRecommendedPrice || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  ` : `
                    <td>${item.id}</td>
                    <td>${item.name}</td>
                    <td>${item.manufacturer || 'N/A'}</td>
                    ${reportType === 'Available Stock' ? `
                      <td>${item.available_stock || 0}</td>
                      <td>${item.reserved_stock || 0}</td>
                      <td>${item.total_stock || 0}</td>
                      <td>${item.available_from ? new Date(item.available_from).toLocaleDateString() : 'N/A'}</td>
                      <td>Rs. ${parseFloat(item.recommended_price || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>Rs. ${(parseInt(item.available_stock || 0) * parseFloat(item.recommended_price || 0)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    ` : `
                      <td>${item.sold_stock || 0}</td>
                      <td>${item.total_stock || 0}</td>
                      <td>${item.sold_date ? new Date(item.sold_date).toLocaleDateString() : 'N/A'}</td>
                      <td>Rs. ${parseFloat(item.sold_price || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>Rs. ${(parseInt(item.sold_stock || 0) * parseFloat(item.sold_price || 0)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
      const available = data.filter(part => parseInt(part.available_stock || 0) > 0);
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

  const handleGetSoldStock = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // Fetch bills within the date range
      const res = await fetch(API_ENDPOINTS.BILLS, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch bills');
      }
      const bills = await res.json();
      
      // Filter bills by date range and extract sold items
      const filteredBills = bills.filter(bill => {
        const billDate = new Date(bill.date || bill.created_at);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return billDate >= start && billDate <= end && bill.status === 'active';
      });
      
      // Convert bill items to sold stock format
      const soldItems = [];
      filteredBills.forEach(bill => {
        if (bill.items && bill.items.length > 0) {
          bill.items.forEach(item => {
            soldItems.push({
              id: item.part_id,
              name: item.part_name,
              manufacturer: item.manufacturer,
              sold_stock: item.quantity,
              sold_price: item.unit_price,
              total_revenue: item.total_price,
              sold_date: bill.date || bill.created_at,
              bill_number: bill.bill_number || bill.id,
              customer_name: bill.customer_name,
              recommended_price: item.unit_price // We'll use the sold price as baseline
            });
          });
        }
      });
      
      setSoldStock(soldItems);
      setShowSoldStock(true);
      const totalQuantity = soldItems.reduce((total, item) => total + parseInt(item.sold_stock || 0), 0);
      const totalRevenue = soldItems.reduce((total, item) => total + parseFloat(item.total_revenue || 0), 0);
      setSuccess(`Found ${soldItems.length} items with ${totalQuantity} units sold between ${startDate} and ${endDate}. Total revenue: Rs ${totalRevenue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}`);
    } catch (err) {
      console.error('Error fetching sold stock:', err);
      setError('Failed to retrieve sold stock.');
    } finally {
      setLoading(false);
    }
  };

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
            parentStatus: parentMap[part.parent_id].stock_status,
            parentAvailableStock: parentMap[part.parent_id].available_stock,
            parentTotalStock: parentMap[part.parent_id].total_stock,
            childId: part.id,
            childName: part.name,
            childManufacturer: part.manufacturer,
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
      });
      
      // Sort by parent ID, then by child ID
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
                      <th>Available Qty</th>
                      <th>Reserved Qty</th>
                      <th>Total Stock</th>
                      <th>Available From</th>
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
                        <td><span className="badge bg-success">{part.available_stock || 0}</span></td>
                        <td><span className="badge bg-warning">{part.reserved_stock || 0}</span></td>
                        <td><span className="badge bg-info">{part.total_stock || 0}</span></td>
                        <td>{part.available_from ? part.available_from.slice(0, 10) : 'N/A'}</td>
                        <td>{
                          part.recommended_price !== null && part.recommended_price !== undefined
                            ? `Rs. ${parseFloat(part.recommended_price).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                            : 'N/A'
                        }</td>
                        <td><strong>{
                          part.recommended_price !== null && part.recommended_price !== undefined
                            ? `Rs. ${(parseInt(part.available_stock || 0) * parseFloat(part.recommended_price)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
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
                    <li>Total Inventory Value: <strong>Rs. {availableStock.reduce((total, item) => total + (parseInt(item.available_stock || 0) * parseFloat(item.recommended_price || 0)), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</strong></li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sold Stock Section */}
        <div className="card">
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
            <div className="row g-3 mb-3">
              <div className="col-md-4">
                <label className="form-label">Start Date:</label>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">End Date:</label>
                <input
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="col-md-4 d-flex align-items-end">
                <button className="btn btn-primary me-2" onClick={handleGetSoldStock}>
                  Get Sold Stock
                </button>
                {soldStock.length > 0 && (
                  <button 
                    className="btn btn-success" 
                    onClick={() => printStockReport(soldStock, 'Sold Stock', `${startDate} to ${endDate}`)}
                  >
                    Print Report
                  </button>
                )}
              </div>
            </div>

            {soldStock.length > 0 && showSoldStock && (
              <div className="table-responsive">
                <table className="table table-bordered table-striped align-middle text-nowrap fs-6">
                  <thead className="table-dark">
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Manufacturer</th>
                      <th>Quantity Sold</th>
                      <th>Unit Price (Rs.)</th>
                      <th>Total Revenue (Rs.)</th>
                      <th>Date Sold</th>
                      <th>Bill ID</th>
                      <th>Customer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soldStock.map((item, index) => (
                      <tr key={`${item.id}-${index}`}>
                        <td>{item.id}</td>
                        <td>{item.name}</td>
                        <td>{item.manufacturer}</td>
                        <td><span className="badge bg-danger">{item.sold_stock}</span></td>
                        <td>Rs. {parseFloat(item.sold_price).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</td>
                        <td><strong>Rs. {parseFloat(item.total_revenue).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</strong></td>
                        <td>{item.sold_date ? item.sold_date.slice(0, 10) : 'N/A'}</td>
                        <td>#{item.bill_number}</td>
                        <td>{item.customer_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3">
                  <strong>Summary:</strong>
                  <ul>
                    <li>Total Items Sold: {soldStock.length}</li>
                    <li>Total Quantity Sold: <span className="badge bg-danger">{soldStock.reduce((total, item) => total + parseInt(item.sold_stock || 0), 0)} units</span></li>
                    <li>Total Revenue: <strong>Rs. {soldStock.reduce((total, item) => total + parseFloat(item.total_revenue || 0), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</strong></li>
                    <li>Average Sale Price per Unit: Rs. {soldStock.reduce((total, item) => total + parseInt(item.sold_stock || 0), 0) > 0 ? (soldStock.reduce((total, item) => total + parseFloat(item.total_revenue || 0), 0) / soldStock.reduce((total, item) => total + parseInt(item.sold_stock || 0), 0)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }) : '0.00'}</li>
                  </ul>
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
                      <th>Parent Manufacturer</th>
                      <th>Parent Status</th>
                      <th>Parent Stock</th>
                      <th>Child ID</th>
                      <th>Child Name</th>
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
      </div>
    </div>
  );
}

export default StockManagement;

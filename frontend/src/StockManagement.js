import React, { useState } from 'react';
import { API_ENDPOINTS } from './config/api';

function StockManagement() {
  const [availableStock, setAvailableStock] = useState([]);
  const [soldStock, setSoldStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [token] = useState(localStorage.getItem('token') || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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
                <h4>Total Available Items</h4>
                <p>${stockData.length}</p>
              </div>
              <div class="stat-box">
                <h4>Total Value (Recommended)</h4>
                <p>₹${stockData.reduce((total, item) => total + parseFloat(item.recommended_price || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          ` : `
            <div class="stats">
              <div class="stat-box">
                <h4>Total Sold Items</h4>
                <p>${stockData.length}</p>
              </div>
              <div class="stat-box">
                <h4>Total Revenue</h4>
                <p>₹${stockData.reduce((total, item) => total + parseFloat(item.sold_price || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div class="stat-box">
                <h4>Average Sale Price</h4>
                <p>₹${stockData.length > 0 ? (stockData.reduce((total, item) => total + parseFloat(item.sold_price || 0), 0) / stockData.length).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</p>
              </div>
            </div>
          `}
          <table class="stock-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Manufacturer</th>
                ${reportType === 'Available Stock' ? `
                  <th>Available From</th>
                  <th>Recommended Price (₹)</th>
                ` : `
                  <th>Sold Date</th>
                  <th>Sold Price (₹)</th>
                  <th>Recommended Price (₹)</th>
                `}
              </tr>
            </thead>
            <tbody>
              ${stockData.map(item => `
                <tr>
                  <td>${item.id}</td>
                  <td>${item.name}</td>
                  <td>${item.manufacturer || 'N/A'}</td>
                  ${reportType === 'Available Stock' ? `
                    <td>${item.available_from ? new Date(item.available_from).toLocaleDateString() : 'N/A'}</td>
                    <td>₹${parseFloat(item.recommended_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  ` : `
                    <td>${item.sold_date ? new Date(item.sold_date).toLocaleDateString() : 'N/A'}</td>
                    <td>₹${parseFloat(item.sold_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>₹${parseFloat(item.recommended_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
      const available = data.filter(part => part.stock_status === 'available');
      setAvailableStock(available);
      setSuccess(`Found ${available.length} available items in stock.`);
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
      const res = await fetch(API_ENDPOINTS.PARTS, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch parts');
      }
      const data = await res.json();
      const sold = data.filter(part => {
        if (part.stock_status !== 'sold' || !part.sold_date) return false;
        const soldDate = new Date(part.sold_date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return soldDate >= start && soldDate <= end;
      });
      setSoldStock(sold);
      setSuccess(`Found ${sold.length} items sold between ${startDate} and ${endDate}.`);
    } catch (err) {
      console.error('Error fetching sold stock:', err);
      setError('Failed to retrieve sold stock.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid px-2 px-md-4">
      <div className="card p-2 p-md-4 mt-4 shadow-sm">
        <h2 className="mb-3 fs-4 fs-md-2">Stock Management</h2>
        
        {loading && <div className="alert alert-info">Loading...</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Available Stock Section */}
        <div className="card mb-4">
          <div className="card-header">
            <h4>Available Stock</h4>
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

            {availableStock.length > 0 && (
              <div className="table-responsive">
                <table className="table table-bordered table-striped align-middle text-nowrap fs-6">
                  <thead className="table-dark">
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Manufacturer</th>
                      <th>Available From</th>
                      <th>Recommended Price (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableStock.map(part => (
                      <tr key={part.id}>
                        <td>{part.id}</td>
                        <td>{part.name}</td>
                        <td>{part.manufacturer}</td>
                        <td>{part.available_from ? part.available_from.slice(0, 10) : 'N/A'}</td>
                        <td>{
                          part.recommended_price !== null && part.recommended_price !== undefined
                            ? `₹${parseFloat(part.recommended_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                            : 'N/A'
                        }</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3">
                  <strong>Summary:</strong>
                  <ul>
                    <li>Total Available Items: {availableStock.length}</li>
                    <li>Total Inventory Value: ₹{availableStock.reduce((total, item) => total + parseFloat(item.recommended_price || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sold Stock Section */}
        <div className="card">
          <div className="card-header">
            <h4>Sold Stock Report</h4>
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

            {soldStock.length > 0 && (
              <div className="table-responsive">
                <table className="table table-bordered table-striped align-middle text-nowrap fs-6">
                  <thead className="table-dark">
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Manufacturer</th>
                      <th>Sold Date</th>
                      <th>Sold Price (₹)</th>
                      <th>Recommended Price (₹)</th>
                      <th>Profit/Loss (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soldStock.map(part => (
                      <tr key={part.id}>
                        <td>{part.id}</td>
                        <td>{part.name}</td>
                        <td>{part.manufacturer}</td>
                        <td>{part.sold_date ? part.sold_date.slice(0, 10) : 'N/A'}</td>
                        <td>{
                          part.sold_price !== null && part.sold_price !== undefined
                            ? `₹${parseFloat(part.sold_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                            : 'N/A'
                        }</td>
                        <td>{
                          part.recommended_price !== null && part.recommended_price !== undefined
                            ? `₹${parseFloat(part.recommended_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                            : 'N/A'
                        }</td>
                        <td className={
                          parseFloat(part.sold_price || 0) >= parseFloat(part.recommended_price || 0) 
                            ? 'text-success' 
                            : 'text-danger'
                        }>
                          {part.sold_price && part.recommended_price
                            ? `₹${(parseFloat(part.sold_price) - parseFloat(part.recommended_price)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                            : 'N/A'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3">
                  <strong>Summary:</strong>
                  <ul>
                    <li>Total Items Sold: {soldStock.length}</li>
                    <li>Total Revenue: ₹{soldStock.reduce((total, item) => total + parseFloat(item.sold_price || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</li>
                    <li>Expected Revenue (Recommended Price): ₹{soldStock.reduce((total, item) => total + parseFloat(item.recommended_price || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</li>
                    <li>Total Profit/Loss: <span className={
                      soldStock.reduce((total, item) => total + (parseFloat(item.sold_price || 0) - parseFloat(item.recommended_price || 0)), 0) >= 0
                        ? 'text-success'
                        : 'text-danger'
                    }>
                      ₹{soldStock.reduce((total, item) => total + (parseFloat(item.sold_price || 0) - parseFloat(item.recommended_price || 0)), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}
                    </span></li>
                    <li>Average Sale Price: ₹{soldStock.length > 0 ? (soldStock.reduce((total, item) => total + parseFloat(item.sold_price || 0), 0) / soldStock.length).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }) : '0.00'}</li>
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

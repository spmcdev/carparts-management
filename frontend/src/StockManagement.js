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
                <p>Rs. ${stockData.reduce((total, item) => total + parseFloat(item.recommended_price || 0), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          ` : `
                          <div className="col-md-4">
                <strong>Total Value Sold:</strong>
                <p>Rs. ${stockData.reduce((total, item) => total + parseFloat(item.sold_price || 0), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="col-md-4">
                <strong>Average Sale Price:</strong>
                <p>Rs. ${stockData.length > 0 ? (stockData.reduce((total, item) => total + parseFloat(item.sold_price || 0), 0) / stockData.length).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</p>
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
                  <th>Recommended Price (Rs.)</th>
                ` : reportType === 'Parent-Child Relationships' ? `
                  <th>Parent ID</th>
                  <th>Parent Name</th>
                  <th>Child ID</th>
                  <th>Child Name</th>
                  <th>Child Status</th>
                ` : `
                  <th>Sold Date</th>
                  <th>Sold Price (Rs.)</th>
                  <th>Recommended Price (Rs.)</th>
                `}
              </tr>
            </thead>
            <tbody>
              ${stockData.map(item => `
                <tr>
                  ${reportType === 'Parent-Child Relationships' ? `
                    <td>-</td>
                    <td>Relationship</td>
                    <td>-</td>
                    <td>${item.parentId}</td>
                    <td>${item.parentName}</td>
                    <td>${item.childId}</td>
                    <td>${item.childName}</td>
                    <td>${item.childStatus}</td>
                  ` : `
                    <td>${item.id}</td>
                    <td>${item.name}</td>
                    <td>${item.manufacturer || 'N/A'}</td>
                    ${reportType === 'Available Stock' ? `
                      <td>${item.available_from ? new Date(item.available_from).toLocaleDateString() : 'N/A'}</td>
                      <td>Rs. ${parseFloat(item.recommended_price || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    ` : `
                      <td>${item.sold_date ? new Date(item.sold_date).toLocaleDateString() : 'N/A'}</td>
                      <td>Rs. ${parseFloat(item.sold_price || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>Rs. ${parseFloat(item.recommended_price || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
            childId: part.id,
            childName: part.name,
            childManufacturer: part.manufacturer,
            childStatus: part.stock_status,
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
                      <th>Recommended Price (Rs.)</th>
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
                            ? `Rs. ${parseFloat(part.recommended_price).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
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
                    <li>Total Inventory Value: Rs. {availableStock.reduce((total, item) => total + parseFloat(item.recommended_price || 0), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</li>
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
                      <th>Sold Price (Rs.)</th>
                      <th>Recommended Price (Rs.)</th>
                      <th>Profit/Loss (Rs.)</th>
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
                            ? `Rs. ${parseFloat(part.sold_price).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                            : 'N/A'
                        }</td>
                        <td>{
                          part.recommended_price !== null && part.recommended_price !== undefined
                            ? `Rs. ${parseFloat(part.recommended_price).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                            : 'N/A'
                        }</td>
                        <td className={
                          parseFloat(part.sold_price || 0) >= parseFloat(part.recommended_price || 0) 
                            ? 'text-success' 
                            : 'text-danger'
                        }>
                          {part.sold_price && part.recommended_price
                            ? `Rs. ${(parseFloat(part.sold_price) - parseFloat(part.recommended_price)).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
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
                    <li>Total Revenue: Rs. {soldStock.reduce((total, item) => total + parseFloat(item.sold_price || 0), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</li>
                    <li>Expected Revenue (Recommended Price): Rs. {soldStock.reduce((total, item) => total + parseFloat(item.recommended_price || 0), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</li>
                    <li>Total Profit/Loss: <span className={
                      soldStock.reduce((total, item) => total + (parseFloat(item.sold_price || 0) - parseFloat(item.recommended_price || 0)), 0) >= 0
                        ? 'text-success'
                        : 'text-danger'
                    }>
                      Rs. {soldStock.reduce((total, item) => total + (parseFloat(item.sold_price || 0) - parseFloat(item.recommended_price || 0)), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}
                    </span></li>
                    <li>Average Sale Price: Rs. {soldStock.length > 0 ? (soldStock.reduce((total, item) => total + parseFloat(item.sold_price || 0), 0) / soldStock.length).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true }) : '0.00'}</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Parent-Child Relationship Report Section */}
        <div className="card">
          <div className="card-header">
            <h4>Parent-Child Relationship Report</h4>
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
            
            {parentChildRelations.length > 0 && (
              <div className="table-responsive">
                <table className="table table-bordered table-striped align-middle text-nowrap fs-6">
                  <thead className="table-dark">
                    <tr>
                      <th>Parent ID</th>
                      <th>Parent Name</th>
                      <th>Parent Manufacturer</th>
                      <th>Parent Status</th>
                      <th>Child ID</th>
                      <th>Child Name</th>
                      <th>Child Manufacturer</th>
                      <th>Child Status</th>
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
                    <li>Child Parts with Available Status: {parentChildRelations.filter(r => r.childStatus === 'available').length}</li>
                    <li>Child Parts with Sold Status: {parentChildRelations.filter(r => r.childStatus === 'sold').length}</li>
                    <li>Total Value of Child Parts: Rs. {parentChildRelations.reduce((total, relation) => total + parseFloat(relation.childRecommendedPrice || 0), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</li>
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

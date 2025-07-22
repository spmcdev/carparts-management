import React, { useState } from 'react';
import { API_ENDPOINTS } from './config/api';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

function Sales({ token }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [sellId, setSellId] = useState(null);
  const [sellPrice, setSellPrice] = useState('');
  // const [showBillModal, setShowBillModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [bills, setBills] = useState([]);

  const printBill = (bill) => {
    const printContent = `
      <html>
        <head>
          <title>Bill - ${bill.bill_number}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .bill-details { margin-bottom: 20px; }
            .items-table { width: 100%; border-collapse: collapse; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items-table th { background-color: #f2f2f2; }
            .total { margin-top: 20px; font-weight: bold; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Rasuki Group</h1>
            <h2>Bill Receipt</h2>
          </div>
          <div class="bill-details">
            <p><strong>Bill Number:</strong> ${bill.bill_number}</p>
            <p><strong>Customer Name:</strong> ${bill.customer_name}</p>
            <p><strong>Date:</strong> ${new Date(bill.date).toLocaleDateString()}</p>
          </div>
          <table class="items-table">
            <thead>
              <tr>
                <th>Item ID</th>
                <th>Name</th>
                <th>Manufacturer</th>
                <th>Price (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${bill.items.map(item => `
                <tr>
                  <td>${item.id}</td>
                  <td>${item.name}</td>
                  <td>${item.manufacturer || 'N/A'}</td>
                  <td>₹${parseFloat(item.sold_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            <p>Total Amount: ₹${bill.items.reduce((total, item) => total + parseFloat(item.sold_price || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <button onclick="window.print()">Print Bill</button>
        </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    console.log('Sales - Token:', token ? 'Present' : 'Missing');
    console.log('Sales - API URL:', API_ENDPOINTS.PARTS);
    
    try {
      const res = await fetch(API_ENDPOINTS.PARTS, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      
      console.log('Sales - Response status:', res.status);
      console.log('Sales - Response ok:', res.ok);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Sales - Parts data received:', data.length, 'parts');
      
      const filtered = data.filter(
        part =>
          part.id.toString() === search.trim() ||
          part.name.toLowerCase().includes(search.trim().toLowerCase())
      );
      setResults(filtered);
      if (filtered.length === 0) setError('No matching parts found.');
    } catch (err) {
      console.error('Sales - Search error:', err);
      setError(`Failed to search parts: ${err.message}`);
    }
    setLoading(false);
  };

  const handleSell = (id) => {
    setSellId(id);
    setSellPrice('');
    setShowModal(true);
  };

  const handleConfirmSell = async () => {
    setError('');
    setSuccess('');
    
    console.log('Sales - Starting sell process for part ID:', sellId);
    console.log('Sales - Sell price:', sellPrice);
    console.log('Sales - Customer name:', customerName);
    console.log('Sales - Bill number:', billNumber);
    
    try {
      // Step 1: Mark part as sold
      console.log('Sales - Step 1: Marking part as sold...');
      const res = await fetch(`${API_ENDPOINTS.PARTS}/${sellId}/sell`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ sold_price: sellPrice })
      });
      
      console.log('Sales - Sell response status:', res.status);
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Sales - Sell failed:', errorText);
        throw new Error(`Failed to sell part: ${res.status} - ${errorText}`);
      }

      const soldPartResponse = await res.json();
      console.log('Sales - Part marked as sold:', soldPartResponse);

      const soldItem = results.find(part => part.id === sellId);
      const updatedItem = { ...soldItem, stock_status: 'sold', sold_date: new Date().toISOString().split('T')[0], sold_price: sellPrice };
      setResults(results.map(part => part.id === sellId ? updatedItem : part));

      // Step 2: Create bill
      console.log('Sales - Step 2: Creating bill...');
      const newBill = {
        customerName,
        billNumber: billNumber || `BILL-${Date.now()}`,
        items: [updatedItem]
      };
      
      console.log('Sales - Bill data:', newBill);

      const billRes = await fetch(API_ENDPOINTS.BILLS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(newBill)
      });
      
      console.log('Sales - Bill response status:', billRes.status);
      if (!billRes.ok) {
        const billErrorText = await billRes.text();
        console.error('Sales - Bill creation failed:', billErrorText);
        throw new Error(`Failed to save bill: ${billRes.status} - ${billErrorText}`);
      }

      const savedBill = await billRes.json();
      console.log('Sales - Bill created successfully:', savedBill);
      
      setSuccess('Part sold and bill saved successfully!');
      
      // Auto-print the bill after successful sale
      const billToPrint = {
        bill_number: newBill.billNumber,
        customer_name: newBill.customerName,
        date: new Date().toISOString().split('T')[0],
        items: newBill.items
      };
      printBill(billToPrint);
      
      setShowModal(false);
    } catch (err) {
      console.error('Sales - Overall sell process failed:', err);
      setError(`Failed to sell part or save bill: ${err.message}`);
    }
  };

  const handleRetrieveBills = async (searchTerm = '') => {
    setError('');
    setLoading(true);
    
    console.log('Sales - Retrieving bills, Token:', token ? 'Present' : 'Missing');
    console.log('Sales - Bills API URL:', API_ENDPOINTS.BILLS);
    
    try {
      const res = await fetch(API_ENDPOINTS.BILLS, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      
      console.log('Sales - Bills response status:', res.status);
      console.log('Sales - Bills response ok:', res.ok);
      
      if (!res.ok) {
        throw new Error(`Failed to fetch bills - HTTP ${res.status}`);
      }
      const data = await res.json();
      console.log('Sales - Bills data received:', data.length, 'bills');
      
      const filteredBills = searchTerm.trim() === ''
        ? data
        : data.filter(
            bill =>
              bill.bill_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
              bill.customer_name.toLowerCase().includes(searchTerm.toLowerCase())
          );
      setBills(filteredBills);
    } catch (err) {
      console.error('Sales - Bills retrieval error:', err);
      setError(`Failed to retrieve bills: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid px-2 px-md-4">
      <div className="card p-2 p-md-4 mt-4 shadow-sm">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="mb-0 fs-4 fs-md-2">Sales</h2>
          <small className="text-muted">
            <i className="bi bi-shield-check"></i> All actions are logged for audit
          </small>
        </div>
        <form className="row g-2 g-md-3 mb-3" onSubmit={handleSearch}>
          <div className="col-12 col-md-8 mb-2 mb-md-0">
            <input
              type="text"
              className="form-control"
              placeholder="Search by ID or Name"
              value={search}
              onChange={e => setSearch(e.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-4 d-grid">
            <button type="submit" className="btn btn-primary w-100">Search</button>
          </div>
        </form>
        {loading && <div className="alert alert-info">Loading...</div>}
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        {results.length > 0 && (
          <div className="table-responsive">
            <table className="table table-bordered table-striped mt-3 align-middle text-nowrap fs-6">
              <thead className="table-dark">
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Manufacturer</th>
                  <th>Status</th>
                  <th>Available From</th>
                  <th>Sold Date</th>
                  <th>Recommended Price (₹)</th>
                  <th>Sold Price (₹)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map(part => (
                  <tr key={part.id}>
                    <td>{part.id}</td>
                    <td>{part.name}</td>
                    <td>{part.manufacturer}</td>
                    <td>
                      <span className={
                        part.stock_status === 'available' ? 'badge bg-success' :
                        part.stock_status === 'sold' ? 'badge bg-danger' :
                        part.stock_status === 'reserved' ? 'badge bg-warning text-dark' :
                        'badge bg-secondary'
                      }>
                        {part.stock_status.charAt(0).toUpperCase() + part.stock_status.slice(1)}
                      </span>
                    </td>
                    <td>{part.available_from ? part.available_from.slice(0, 10) : ''}</td>
                    <td>{part.sold_date ? part.sold_date.slice(0, 10) : ''}</td>
                    <td>{
                      part.recommended_price !== null && part.recommended_price !== undefined
                        ? `₹${parseFloat(part.recommended_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                        : ''
                    }</td>
                    <td>{
                      part.sold_price !== null && part.sold_price !== undefined
                        ? `₹${parseFloat(part.sold_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                        : ''
                    }</td>
                    <td>
                      {part.stock_status !== 'sold' ? (
                        <button className="btn btn-success btn-sm w-100" onClick={() => handleSell(part.id)}>
                          Sell
                        </button>
                      ) : (
                        <span className="badge bg-secondary w-100">Sold</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button className="btn btn-secondary mt-3 ms-2" onClick={() => handleRetrieveBills()}>Retrieve Bills</button>
        <input
          type="text"
          className="form-control mt-3"
          placeholder="Search bills by number or customer name"
          onChange={e => handleRetrieveBills(e.target.value)}
        />
        {bills.length > 0 && (
          <div className="table-responsive mt-4">
            <table className="table table-bordered table-striped align-middle text-nowrap fs-6">
              <thead className="table-dark">
                <tr>
                  <th>Bill Number</th>
                  <th>Customer Name</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill, index) => (
                  <tr key={index}>
                    <td>{bill.bill_number}</td>
                    <td>{bill.customer_name}</td>
                    <td>{bill.date}</td>
                    <td>
                      {bill.items.map(item => (
                        <div key={item.id}>{item.name} - ₹{item.sold_price}</div>
                      ))}
                    </td>
                    <td>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => printBill(bill)}
                      >
                        Print Bill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for selling price */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Set Selling Price</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <input
            type="text"
            className="form-control mb-3"
            placeholder="Customer Name"
            value={customerName}
            onChange={e => setCustomerName(e.target.value)}
            required
          />
          <input
            type="text"
            className="form-control mb-3"
            placeholder="Bill Number (Optional)"
            value={billNumber}
            onChange={e => setBillNumber(e.target.value)}
          />
          <input
            type="number"
            className="form-control"
            placeholder="Enter selling price"
            value={sellPrice}
            onChange={e => setSellPrice(e.target.value)}
            min="0"
            step="0.01"
            required
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirmSell}>
            Confirm Sell
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Sales;

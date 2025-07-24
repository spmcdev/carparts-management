import React, { useState, useEffect } from 'react';
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
  const [customerPhone, setCustomerPhone] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [bills, setBills] = useState([]);
  const [allBills, setAllBills] = useState([]); // Store all bills for filtering
  const [billSearchTerm, setBillSearchTerm] = useState(''); // Search term for bills
  
  // Bill Edit States
  const [showEditBillModal, setShowEditBillModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editBillNumber, setEditBillNumber] = useState('');
  
  // Bill Refund States
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundingBill, setRefundingBill] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [isPartialRefund, setIsPartialRefund] = useState(false);
  
  // Child Parts Search States
  const [parentSearch, setParentSearch] = useState('');
  const [showChildPartsOnly, setShowChildPartsOnly] = useState(false);

  // Reservation States
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reserveId, setReserveId] = useState(null);
  const [reserveCustomerName, setReserveCustomerName] = useState('');
  const [reserveCustomerPhone, setReserveCustomerPhone] = useState('');
  const [reservePriceAgreed, setReservePriceAgreed] = useState('');
  const [reserveDepositAmount, setReserveDepositAmount] = useState('');
  const [reserveNotes, setReserveNotes] = useState('');
  const [reservations, setReservations] = useState([]);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeReservationId, setCompleteReservationId] = useState(null);
  const [completeFinalPrice, setCompleteFinalPrice] = useState('');
  const [completeCustomerName, setCompleteCustomerName] = useState('');
  const [completeCustomerPhone, setCompleteCustomerPhone] = useState('');
  const [reservationSearch, setReservationSearch] = useState('');
  const [reservationStatus, setReservationStatus] = useState('reserved');

  const printBill = (bill) => {
    const printContent = `
      <html>
        <head>
          <title>Bill - ${bill.bill_number || 'No Bill Number'}</title>
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
            <p><strong>Bill Number:</strong> ${bill.bill_number || 'No Bill Number'}</p>
            <p><strong>Customer Name:</strong> ${bill.customer_name || 'N/A'}</p>
            ${bill.customer_phone ? `<p><strong>Phone Number:</strong> ${bill.customer_phone}</p>` : ''}
            <p><strong>Date:</strong> ${new Date(bill.date).toLocaleDateString()}</p>
          </div>
          <table class="items-table">
            <thead>
              <tr>
                <th>Item ID</th>
                <th>Name</th>
                <th>Manufacturer</th>
                <th>Price (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              ${bill.items.map(item => `
                <tr>
                  <td>${item.id}</td>
                  <td>${item.name}</td>
                  <td>${item.manufacturer || 'N/A'}</td>
                  <td>Rs. ${parseFloat(item.sold_price || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            <p>Total Amount: Rs. ${bill.items.reduce((total, item) => total + parseFloat(item.sold_price || 0), 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
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
          part.name.toLowerCase().includes(search.trim().toLowerCase()) ||
          (part.parent_id && part.parent_id.toString() === search.trim()) ||
          (part.manufacturer && part.manufacturer.toLowerCase().includes(search.trim().toLowerCase()))
      );
      setResults(filtered);
      if (filtered.length === 0) setError('No matching parts found.');
    } catch (err) {
      console.error('Sales - Search error:', err);
      setError(`Failed to search parts: ${err.message}`);
    }
    setLoading(false);
  };

  const handleChildPartsSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    console.log('Sales - Child Parts Search - Token:', token ? 'Present' : 'Missing');
    console.log('Sales - Child Parts Search - API URL:', API_ENDPOINTS.PARTS);
    
    try {
      const res = await fetch(API_ENDPOINTS.PARTS, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      
      console.log('Sales - Child Parts Search - Response status:', res.status);
      console.log('Sales - Child Parts Search - Response ok:', res.ok);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Sales - Child Parts Search - Parts data received:', data.length, 'parts');
      
      // Filter to get only child parts of the specified parent ID
      const filtered = data.filter(part => 
        part.parent_id && part.parent_id.toString() === parentSearch.trim()
      );
      
      setResults(filtered);
      if (filtered.length === 0) {
        setError(`No child parts found for Parent ID: ${parentSearch.trim()}`);
      } else {
        setSuccess(`Found ${filtered.length} child part(s) for Parent ID: ${parentSearch.trim()}`);
      }
    } catch (err) {
      console.error('Sales - Child Parts Search error:', err);
      setError(`Failed to search child parts: ${err.message}`);
    }
    setLoading(false);
  };

  // Reservation Functions
  const handleReserve = (partId) => {
    setReserveId(partId);
    setShowReserveModal(true);
  };

  const handleReserveSubmit = async () => {
    if (!reserveCustomerName || !reserveCustomerPhone || !reservePriceAgreed) {
      setError('Customer name, phone, and agreed price are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.RESERVATIONS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          part_id: reserveId,
          customer_name: reserveCustomerName,
          customer_phone: reserveCustomerPhone,
          price_agreed: parseFloat(reservePriceAgreed),
          deposit_amount: parseFloat(reserveDepositAmount) || 0,
          notes: reserveNotes
        })
      });

      if (response.ok) {
        const reservation = await response.json();
        setSuccess(`Part reserved successfully! Reservation Number: ${reservation.reservation_number}`);
        setShowReserveModal(false);
        resetReserveForm();
        
        // Remove the reserved part from current results
        setResults(prev => prev.filter(part => part.id !== reserveId));
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to reserve part');
      }
    } catch (err) {
      setError('Failed to reserve part');
    }
    setLoading(false);
  };

  const resetReserveForm = () => {
    setReserveId(null);
    setReserveCustomerName('');
    setReserveCustomerPhone('');
    setReservePriceAgreed('');
    setReserveDepositAmount('');
    setReserveNotes('');
  };

  const handleGetReservations = async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      if (reservationSearch) queryParams.append('search', reservationSearch);
      if (reservationStatus) queryParams.append('status', reservationStatus);

      const response = await fetch(`${API_ENDPOINTS.RESERVATIONS}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setReservations(data);
      } else {
        setError('Failed to fetch reservations');
      }
    } catch (err) {
      setError('Failed to fetch reservations');
    }
    setLoading(false);
  };

  const handleCompleteReservation = (reservation) => {
    setCompleteReservationId(reservation.id);
    setCompleteCustomerName(reservation.customer_name);
    setCompleteCustomerPhone(reservation.customer_phone);
    setCompleteFinalPrice(reservation.price_agreed.toString());
    setShowCompleteModal(true);
  };

  const handleCompleteReservationSubmit = async () => {
    if (!completeCustomerName || !completeCustomerPhone || !completeFinalPrice) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.RESERVATIONS}/${completeReservationId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_name: completeCustomerName,
          customer_phone: completeCustomerPhone,
          final_price: parseFloat(completeFinalPrice)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(`Sale completed successfully! Bill Number: ${data.bill.bill_number}`);
        setShowCompleteModal(false);
        resetCompleteForm();
        
        // Refresh reservations
        handleGetReservations();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to complete sale');
      }
    } catch (err) {
      setError('Failed to complete sale');
    }
    setLoading(false);
  };

  const resetCompleteForm = () => {
    setCompleteReservationId(null);
    setCompleteCustomerName('');
    setCompleteCustomerPhone('');
    setCompleteFinalPrice('');
  };

  const handleCancelReservation = async (reservationId) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.RESERVATIONS}/${reservationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setSuccess('Reservation cancelled successfully');
        handleGetReservations();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to cancel reservation');
      }
    } catch (err) {
      setError('Failed to cancel reservation');
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
        customerPhone,
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
        customer_phone: newBill.customerPhone,
        date: new Date().toISOString().split('T')[0],
        items: newBill.items
      };
      printBill(billToPrint);
      
      // Clear form fields
      setCustomerName('');
      setCustomerPhone('');
      setBillNumber('');
      setSellPrice('');
      
      setShowModal(false);
    } catch (err) {
      console.error('Sales - Overall sell process failed:', err);
      setError(`Failed to sell part or save bill: ${err.message}`);
    }
  };

  const handleRetrieveBills = async () => {
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
      
      // Store all bills for real-time filtering
      setAllBills(data);
      setBills(data); // Initially show all bills
    } catch (err) {
      console.error('Sales - Bills retrieval error:', err);
      setError(`Failed to retrieve bills: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Real-time filtering effect with debounce
  useEffect(() => {
    if (allBills.length === 0) return;
    
    // Debounce the search to avoid too many operations
    const timeoutId = setTimeout(() => {
      const filteredBills = billSearchTerm.trim() === ''
        ? allBills
        : allBills.filter(
            bill =>
              (bill.bill_number && bill.bill_number.toLowerCase().includes(billSearchTerm.toLowerCase())) ||
              (bill.customer_name && bill.customer_name.toLowerCase().includes(billSearchTerm.toLowerCase())) ||
              (bill.customer_phone && bill.customer_phone.includes(billSearchTerm.trim()))
          );
      
      setBills(filteredBills);
    }, 150); // 150ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [billSearchTerm, allBills]);

  // Bill Edit Handlers
  const handleEditBill = (bill) => {
    setEditingBill(bill);
    setEditCustomerName(bill.customer_name || '');
    setEditCustomerPhone(bill.customer_phone || '');
    setEditBillNumber(bill.bill_number || '');
    setShowEditBillModal(true);
  };

  const handleSaveEditBill = async () => {
    if (!editingBill) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_ENDPOINTS.BILLS}/${editingBill.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({
          customer_name: editCustomerName,
          customer_phone: editCustomerPhone,
          bill_number: editBillNumber || null,
          items: editingBill.items // Include existing items
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update bill - HTTP ${response.status}`);
      }

      const updatedBill = await response.json();
      setSuccess('Bill updated successfully!');
      
      // Update the bills in state
      const updatedAllBills = allBills.map(bill => 
        bill.id === editingBill.id ? { ...bill, ...updatedBill } : bill
      );
      setAllBills(updatedAllBills);
      
      setShowEditBillModal(false);
      setEditingBill(null);
    } catch (err) {
      console.error('Edit bill error:', err);
      setError(`Failed to update bill: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Bill Refund Handlers
  const handleRefundBill = (bill) => {
    setRefundingBill(bill);
    setRefundReason('');
    setRefundAmount('');
    setIsPartialRefund(false);
    setShowRefundModal(true);
  };

  const handleProcessRefund = async () => {
    if (!refundingBill) return;
    
    setLoading(true);
    setError('');
    
    try {
      const refundData = {
        refundReason: refundReason
      };
      
      if (isPartialRefund && refundAmount) {
        refundData.refundAmount = parseFloat(refundAmount);
      }

      const response = await fetch(`${API_ENDPOINTS.BILLS}/${refundingBill.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(refundData)
      });

      if (!response.ok) {
        throw new Error(`Failed to process refund - HTTP ${response.status}`);
      }

      const result = await response.json();
      setSuccess(`${isPartialRefund ? 'Partial refund' : 'Full refund'} processed successfully!`);
      
      // Refresh bills to show updated status
      await handleRetrieveBills();
      
      setShowRefundModal(false);
      setRefundingBill(null);
    } catch (err) {
      console.error('Refund processing error:', err);
      setError(`Failed to process refund: ${err.message}`);
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
              placeholder="Search by ID, Name, Parent Part ID, or Manufacturer"
              value={search}
              onChange={e => setSearch(e.target.value)}
              required
            />
          </div>
          <div className="col-12 col-md-4 d-grid">
            <button type="submit" className="btn btn-primary w-100">Search</button>
          </div>
        </form>

        {/* Child Parts Search Section */}
        <div className="card mb-3 border-info">
          <div className="card-header bg-light">
            <div className="d-flex align-items-center justify-content-between">
              <h6 className="mb-0 text-info">
                <i className="bi bi-diagram-3"></i> Child Parts Search
              </h6>
              <small className="text-muted">Find child parts by Parent Part ID</small>
            </div>
          </div>
          <div className="card-body">
            <form className="row g-2 g-md-3" onSubmit={handleChildPartsSearch}>
              <div className="col-12 col-md-8 mb-2 mb-md-0">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter Parent Part ID to find all child parts"
                  value={parentSearch}
                  onChange={e => setParentSearch(e.target.value)}
                  required
                />
              </div>
              <div className="col-12 col-md-4 d-grid">
                <button type="submit" className="btn btn-info w-100">
                  <i className="bi bi-search"></i> Search Child Parts
                </button>
              </div>
            </form>
          </div>
        </div>
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
                  <th>Parent ID</th>
                  <th>Status</th>
                  <th>Available From</th>
                  <th>Sold Date</th>
                  <th>Recommended Price (Rs.)</th>
                  <th>Sold Price (Rs.)</th>
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
                      {part.parent_id ? (
                        <span className="badge bg-info">{part.parent_id}</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
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
                        ? `Rs. ${parseFloat(part.recommended_price).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                        : ''
                    }</td>
                    <td>{
                      part.sold_price !== null && part.sold_price !== undefined
                        ? `Rs. ${parseFloat(part.sold_price).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                        : ''
                    }</td>
                    <td>
                      {part.stock_status === 'available' ? (
                        <div className="d-grid gap-1">
                          <button className="btn btn-success btn-sm" onClick={() => handleSell(part.id)}>
                            Sell
                          </button>
                          <button className="btn btn-warning btn-sm" onClick={() => handleReserve(part.id)}>
                            Reserve
                          </button>
                        </div>
                      ) : part.stock_status === 'sold' ? (
                        <span className="badge bg-secondary w-100">Sold</span>
                      ) : part.stock_status === 'reserved' ? (
                        <span className="badge bg-warning w-100">Reserved</span>
                      ) : (
                        <span className="badge bg-info w-100">{part.stock_status}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button className="btn btn-secondary mt-3 ms-2" onClick={() => handleRetrieveBills()}>Retrieve Bills</button>
        <div className="d-flex mt-3 gap-2">
          <input
            type="text"
            className="form-control"
            placeholder="Search bills by number, customer name, or phone number"
            value={billSearchTerm}
            onChange={e => setBillSearchTerm(e.target.value)}
          />
          {billSearchTerm && (
            <button 
              className="btn btn-outline-secondary"
              onClick={() => setBillSearchTerm('')}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        {allBills.length > 0 && (
          <small className="text-muted mt-2 d-block">
            Showing {bills.length} of {allBills.length} bills
            {billSearchTerm && ` (filtered by "${billSearchTerm}")`}
          </small>
        )}
        {bills.length > 0 && (
          <div className="table-responsive mt-4">
            <table className="table table-bordered table-striped align-middle text-nowrap fs-6">
              <thead className="table-dark">
                <tr>
                  <th>Bill Number</th>
                  <th>Customer Name</th>
                  <th>Phone Number</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill, index) => (
                  <tr key={index}>
                    <td>{bill.bill_number || 'No Bill Number'}</td>
                    <td>{bill.customer_name || 'N/A'}</td>
                    <td>{bill.customer_phone || 'N/A'}</td>
                    <td>{bill.date}</td>
                    <td>
                      {bill.items.map(item => (
                        <div key={item.id}>{item.name} - Rs. {item.sold_price}</div>
                      ))}
                    </td>
                    <td>
                      <div className="d-flex gap-1 flex-wrap">
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => printBill(bill)}
                          title="Print Bill"
                        >
                          Print
                        </button>
                        <button 
                          className="btn btn-warning btn-sm"
                          onClick={() => handleEditBill(bill)}
                          title="Edit Bill"
                        >
                          Edit
                        </button>
                        {bill.status === 'active' && (
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleRefundBill(bill)}
                            title="Process Refund"
                          >
                            Refund
                          </button>
                        )}
                        {bill.status !== 'active' && (
                          <span className="badge bg-secondary text-capitalize">
                            {bill.status.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Reservations Section */}
        <div className="mt-4">
          <h4 className="mb-3">
            <i className="bi bi-bookmark-check me-2"></i>
            Reservation Management
          </h4>
          
          <div className="row g-3 mb-3">
            <div className="col-12 col-md-6">
              <input
                type="text"
                className="form-control"
                placeholder="Search reservations by number, customer name, or phone"
                value={reservationSearch}
                onChange={e => setReservationSearch(e.target.value)}
              />
            </div>
            <div className="col-12 col-md-3">
              <select
                className="form-select"
                value={reservationStatus}
                onChange={e => setReservationStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="reserved">Reserved</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-12 col-md-3">
              <button 
                className="btn btn-info w-100" 
                onClick={handleGetReservations}
                disabled={loading}
              >
                <i className="bi bi-search me-2"></i>
                Retrieve Reservations
              </button>
            </div>
          </div>

          {reservations.length > 0 && (
            <div className="table-responsive">
              <table className="table table-bordered table-striped mt-3 align-middle text-nowrap fs-6">
                <thead className="table-dark">
                  <tr>
                    <th>Reservation #</th>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Part Name</th>
                    <th>Price Agreed</th>
                    <th>Deposit</th>
                    <th>Remaining</th>
                    <th>Status</th>
                    <th>Reserved Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map(reservation => (
                    <tr key={reservation.id}>
                      <td>
                        <span className="badge bg-info">{reservation.reservation_number}</span>
                      </td>
                      <td>{reservation.customer_name}</td>
                      <td>{reservation.customer_phone}</td>
                      <td>
                        <strong>{reservation.part_name}</strong>
                        <br />
                        <small className="text-muted">{reservation.manufacturer}</small>
                      </td>
                      <td>Rs. {parseFloat(reservation.price_agreed).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                      <td>Rs. {parseFloat(reservation.deposit_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                      <td>Rs. {parseFloat(reservation.remaining_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                      <td>
                        <span className={`badge ${
                          reservation.status === 'reserved' ? 'bg-warning' :
                          reservation.status === 'completed' ? 'bg-success' :
                          reservation.status === 'cancelled' ? 'bg-danger' : 'bg-secondary'
                        }`}>
                          {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                        </span>
                      </td>
                      <td>{new Date(reservation.reserved_date).toLocaleDateString()}</td>
                      <td>
                        {reservation.status === 'reserved' && (
                          <div className="d-grid gap-1">
                            <button 
                              className="btn btn-success btn-sm"
                              onClick={() => handleCompleteReservation(reservation)}
                            >
                              Complete Sale
                            </button>
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => handleCancelReservation(reservation.id)}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                        {reservation.status === 'completed' && (
                          <span className="badge bg-success">Sold</span>
                        )}
                        {reservation.status === 'cancelled' && (
                          <span className="badge bg-danger">Cancelled</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Reserve Modal */}
      <Modal show={showReserveModal} onHide={() => setShowReserveModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-bookmark-plus me-2"></i>
            Reserve Part
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="form-label">Customer Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter customer name"
                value={reserveCustomerName}
                onChange={e => setReserveCustomerName(e.target.value)}
                required
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Customer Phone *</label>
              <input
                type="tel"
                className="form-control"
                placeholder="Enter phone number"
                value={reserveCustomerPhone}
                onChange={e => setReserveCustomerPhone(e.target.value)}
                required
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Price Agreed *</label>
              <input
                type="number"
                className="form-control"
                placeholder="Enter agreed price"
                value={reservePriceAgreed}
                onChange={e => setReservePriceAgreed(e.target.value)}
                min="0"
                step="0.01"
                required
              />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Deposit Amount</label>
              <input
                type="number"
                className="form-control"
                placeholder="Enter deposit amount (optional)"
                value={reserveDepositAmount}
                onChange={e => setReserveDepositAmount(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
            <div className="col-12">
              <label className="form-label">Notes</label>
              <textarea
                className="form-control"
                placeholder="Any additional notes (optional)"
                value={reserveNotes}
                onChange={e => setReserveNotes(e.target.value)}
                rows="3"
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowReserveModal(false)}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleReserveSubmit} disabled={loading}>
            <i className="bi bi-bookmark-check me-2"></i>
            Reserve Part
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Complete Reservation Modal */}
      <Modal show={showCompleteModal} onHide={() => setShowCompleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-check-circle me-2"></i>
            Complete Reservation Sale
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label">Customer Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="Customer Name"
              value={completeCustomerName}
              onChange={e => setCompleteCustomerName(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Customer Phone *</label>
            <input
              type="tel"
              className="form-control"
              placeholder="Customer Phone Number"
              value={completeCustomerPhone}
              onChange={e => setCompleteCustomerPhone(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Final Selling Price *</label>
            <input
              type="number"
              className="form-control"
              placeholder="Enter final selling price"
              value={completeFinalPrice}
              onChange={e => setCompleteFinalPrice(e.target.value)}
              min="0"
              step="0.01"
              required
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCompleteModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleCompleteReservationSubmit} disabled={loading}>
            <i className="bi bi-check-circle me-2"></i>
            Complete Sale
          </Button>
        </Modal.Footer>
      </Modal>

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
            type="tel"
            className="form-control mb-3"
            placeholder="Customer Phone Number (Optional)"
            value={customerPhone}
            onChange={e => setCustomerPhone(e.target.value)}
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

      {/* Edit Bill Modal */}
      <Modal show={showEditBillModal} onHide={() => setShowEditBillModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Bill #{editingBill?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <label className="form-label">Customer Name</label>
            <input
              type="text"
              className="form-control"
              value={editCustomerName}
              onChange={e => setEditCustomerName(e.target.value)}
              placeholder="Enter customer name"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Customer Phone</label>
            <input
              type="tel"
              className="form-control"
              value={editCustomerPhone}
              onChange={e => setEditCustomerPhone(e.target.value)}
              placeholder="Enter phone number (optional)"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Bill Number</label>
            <input
              type="text"
              className="form-control"
              value={editBillNumber}
              onChange={e => setEditBillNumber(e.target.value)}
              placeholder="Enter bill number (optional)"
            />
          </div>
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditBillModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveEditBill} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Refund Bill Modal */}
      <Modal show={showRefundModal} onHide={() => setShowRefundModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Process Refund - Bill #{refundingBill?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="mb-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="refundType"
                id="fullRefund"
                checked={!isPartialRefund}
                onChange={() => setIsPartialRefund(false)}
              />
              <label className="form-check-label" htmlFor="fullRefund">
                Full Refund
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="refundType"
                id="partialRefund"
                checked={isPartialRefund}
                onChange={() => setIsPartialRefund(true)}
              />
              <label className="form-check-label" htmlFor="partialRefund">
                Partial Refund
              </label>
            </div>
          </div>
          
          {isPartialRefund && (
            <div className="mb-3">
              <label className="form-label">Refund Amount (Rs.)</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={refundAmount}
                onChange={e => setRefundAmount(e.target.value)}
                placeholder="Enter refund amount"
                required
              />
            </div>
          )}
          
          <div className="mb-3">
            <label className="form-label">Refund Reason</label>
            <textarea
              className="form-control"
              rows="3"
              value={refundReason}
              onChange={e => setRefundReason(e.target.value)}
              placeholder="Enter reason for refund"
              required
            />
          </div>
          
          {refundingBill && (
            <div className="mb-3">
              <div className="card">
                <div className="card-body">
                  <h6 className="card-title">Bill Details</h6>
                  <p className="card-text mb-1">
                    <strong>Customer:</strong> {refundingBill.customer_name}
                  </p>
                  <p className="card-text mb-1">
                    <strong>Bill Number:</strong> {refundingBill.bill_number || 'No Bill Number'}
                  </p>
                  <p className="card-text mb-0">
                    <strong>Date:</strong> {refundingBill.date}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRefundModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleProcessRefund} 
            disabled={loading || !refundReason.trim() || (isPartialRefund && !refundAmount)}
          >
            {loading ? 'Processing...' : `Process ${isPartialRefund ? 'Partial' : 'Full'} Refund`}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Sales;

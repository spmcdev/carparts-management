import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from './config/api';

function Sales({ token, userRole }) {
  const [availableParts, setAvailableParts] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [partSearchTerm, setPartSearchTerm] = useState('');
  
  // Sale form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [cartItems, setCartItems] = useState([]);
  
  // Edit bill modal state
  const [editingBill, setEditingBill] = useState(null);
  const [editBillData, setEditBillData] = useState({});
  
  // Refund modal state
  const [refundingBill, setRefundingBill] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');

  // Reservation state
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationData, setReservationData] = useState({
    customer_name: '',
    customer_phone: '',
    part_id: '',
    quantity: 1,
    price_agreed: '',
    deposit_amount: 0,
    notes: ''
  });

  // Filter parts based on search term
  const filterParts = (parts, searchTerm) => {
    if (!searchTerm.trim()) return parts;
    
    const term = searchTerm.toLowerCase().trim();
    
    return parts.filter(part => {
      // Search by name
      if (part.name && part.name.toLowerCase().includes(term)) return true;
      
      // Search by manufacturer
      if (part.manufacturer && part.manufacturer.toLowerCase().includes(term)) return true;
      
      // Search by part ID (exact match or starts with)
      if (part.id && (part.id.toString() === term || part.id.toString().startsWith(term))) return true;
      
      // Search by part number
      if (part.part_number && part.part_number.toLowerCase().includes(term)) return true;
      
      // Search by parent ID (exact match or starts with)
      if (part.parent_id && (part.parent_id.toString() === term || part.parent_id.toString().startsWith(term))) return true;
      
      return false;
    });
  };

  // Fetch available parts for sale
  const fetchAvailableParts = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_ENDPOINTS.PARTS}/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch available parts');
      const data = await res.json();
      setAvailableParts(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch bills
  const fetchBills = async (search = '') => {
    try {
      setLoading(true);
      const url = search 
        ? `${API_ENDPOINTS.BILLS}?search=${encodeURIComponent(search)}`
        : API_ENDPOINTS.BILLS;
      
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch bills');
      const data = await res.json();
      setBills(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableParts();
    fetchBills();
  }, [token]);

  // Handle search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchBills(searchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Add item to cart
  const addToCart = (part) => {
    const existingItem = cartItems.find(item => item.part_id === part.id);
    if (existingItem) {
      setCartItems(cartItems.map(item => 
        item.part_id === part.id 
          ? { ...item, quantity: Math.min(item.quantity + 1, part.available_stock) }
          : item
      ));
    } else {
      setCartItems([...cartItems, {
        part_id: part.id,
        part_name: part.name,
        manufacturer: part.manufacturer,
        quantity: 1,
        unit_price: part.recommended_price || 0,
        max_available: part.available_stock
      }]);
    }
  };

  // Update cart item quantity
  const updateCartQuantity = (partId, quantity) => {
    if (quantity <= 0) {
      setCartItems(cartItems.filter(item => item.part_id !== partId));
    } else {
      setCartItems(cartItems.map(item => 
        item.part_id === partId 
          ? { ...item, quantity: Math.min(quantity, item.max_available) }
          : item
      ));
    }
  };

  // Update cart item price
  const updateCartPrice = (partId, price) => {
    setCartItems(cartItems.map(item => 
      item.part_id === partId 
        ? { ...item, unit_price: parseFloat(price) || 0 }
        : item
    ));
  };

  // Remove item from cart
  const removeFromCart = (partId) => {
    setCartItems(cartItems.filter(item => item.part_id !== partId));
  };

  // Calculate total
  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
  };

  // Create reservation
  const createReservation = async (e) => {
    e.preventDefault();
    if (!reservationData.customer_name || !reservationData.customer_phone || !reservationData.part_id || !reservationData.price_agreed) {
      setError('Please fill in all required fields for reservation');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const res = await fetch(`${API_ENDPOINTS.BASE}/api/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(reservationData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to create reservation');
      }

      const newReservation = await res.json();
      setSuccess(`Reservation created! Reservation number: ${newReservation.reservation_number}`);
      
      // Reset form
      setReservationData({
        customer_name: '',
        customer_phone: '',
        part_id: '',
        quantity: 1,
        price_agreed: '',
        deposit_amount: 0,
        notes: ''
      });
      setShowReservationModal(false);
      
      // Refresh available parts
      fetchAvailableParts();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Process sale
  const processSale = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) {
      setError('Please add items to cart');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const saleData = {
        customer_name: customerName,
        customer_phone: customerPhone || null,
        bill_number: billNumber || null,
        items: cartItems.map(item => ({
          part_id: item.part_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      };

      const res = await fetch(`${API_ENDPOINTS.BASE}/sales/sell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(saleData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to process sale');
      }

      const newBill = await res.json();
      setSuccess(`Sale completed! Bill ID: ${newBill.id}`);
      
      // Reset form
      setCustomerName('');
      setCustomerPhone('');
      setBillNumber('');
      setCartItems([]);
      
      // Refresh data
      fetchAvailableParts();
      fetchBills();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Edit bill
  const handleEditBill = (bill) => {
    setEditingBill(bill);
    setEditBillData({
      bill_number: bill.bill_number || '',
      customer_name: bill.customer_name,
      customer_phone: bill.customer_phone || ''
    });
  };

  const saveEditBill = async () => {
    try {
      const res = await fetch(`${API_ENDPOINTS.BILLS}/${editingBill.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editBillData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update bill');
      }

      setSuccess('Bill updated successfully');
      setEditingBill(null);
      fetchBills();
    } catch (err) {
      setError(err.message);
    }
  };

  // Process refund
  const handleRefund = (bill) => {
    setRefundingBill(bill);
    setRefundAmount(bill.total_amount);
    setRefundReason('');
  };

  const processRefund = async () => {
    try {
      const res = await fetch(`${API_ENDPOINTS.BILLS}/${refundingBill.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          refund_amount: parseFloat(refundAmount),
          refund_reason: refundReason
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to process refund');
      }

      setSuccess('Refund processed successfully');
      setRefundingBill(null);
      setRefundAmount('');
      setRefundReason('');
      fetchBills();
      fetchAvailableParts(); // Refresh in case stock was restored
    } catch (err) {
      setError(err.message);
    }
  };

  // Print bill
  const printBill = (bill) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Bill #${bill.bill_number || bill.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .bill-info { margin-bottom: 20px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .items-table th { background-color: #f2f2f2; }
            .total { text-align: right; font-weight: bold; font-size: 18px; }
            .footer { margin-top: 30px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Rasuki Group</h1>
            <h2>Car Parts Sales Invoice</h2>
          </div>
          <div class="bill-info">
            <p><strong>Bill Number:</strong> ${bill.bill_number || bill.id}</p>
            <p><strong>Date:</strong> ${new Date(bill.date).toLocaleDateString()}</p>
            <p><strong>Customer:</strong> ${bill.customer_name}</p>
            ${bill.customer_phone ? `<p><strong>Phone:</strong> ${bill.customer_phone}</p>` : ''}
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
              ${bill.items.map(item => `
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
            <p>Total Quantity: ${bill.total_quantity}</p>
            <p>Total Amount: Rs ${parseFloat(bill.total_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
          </div>
          <div class="footer">
            <p>Thank you for your business!</p>
            <p>Rasuki Group - Quality Car Parts</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="container-fluid px-2 px-md-4">
      <h2 className="mb-4">Sales Management</h2>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Sale Form */}
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h5>New Sale</h5>
            </div>
            <div className="card-body">
              <form onSubmit={processSale}>
                <div className="mb-3">
                  <label className="form-label">Customer Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Customer Phone</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Bill Number (Optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={billNumber}
                    onChange={e => setBillNumber(e.target.value)}
                  />
                </div>
                
                {/* Cart */}
                <h6>Cart Items ({cartItems.length})</h6>
                {cartItems.length === 0 ? (
                  <p className="text-muted">No items in cart</p>
                ) : (
                  <div className="table-responsive mb-3">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Qty</th>
                          <th>Price</th>
                          <th>Total</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cartItems.map(item => (
                          <tr key={item.part_id}>
                            <td>{item.part_name}</td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                style={{ width: '80px' }}
                                value={item.quantity}
                                onChange={e => updateCartQuantity(item.part_id, parseInt(e.target.value))}
                                min="1"
                                max={item.max_available}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                style={{ width: '100px' }}
                                value={item.unit_price}
                                onChange={e => updateCartPrice(item.part_id, e.target.value)}
                                min="0"
                                step="0.01"
                              />
                            </td>
                            <td>Rs {(item.quantity * item.unit_price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => removeFromCart(item.part_id)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="text-end">
                      <strong>Total: Rs {calculateTotal().toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  </div>
                )}
                
                <button type="submit" className="btn btn-success" disabled={loading || cartItems.length === 0}>
                  {loading ? 'Processing...' : 'Complete Sale'}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Available Parts</h5>
              <button 
                className="btn btn-success btn-sm"
                onClick={() => setShowReservationModal(true)}
              >
                Make Reservation
              </button>
            </div>
            <div className="card-body" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {/* Search for parts */}
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, manufacturer, part ID, part number, or parent ID..."
                  value={partSearchTerm}
                  onChange={(e) => setPartSearchTerm(e.target.value)}
                />
                <small className="text-muted">
                  💡 Try searching by: part name, manufacturer, ID (e.g., "1", "23"), part number, or parent ID
                </small>
              </div>
              
              {loading ? (
                <div className="text-center">Loading parts...</div>
              ) : filterParts(availableParts, partSearchTerm).length === 0 ? (
                <div className="text-muted">No parts available for sale</div>
              ) : (
                <div className="row">
                  {filterParts(availableParts, partSearchTerm).map(part => (
                    <div key={part.id} className="col-12 mb-2">
                      <div className="card card-body p-2">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>{part.name}</strong>
                            <span className="badge bg-light text-dark ms-2">ID: {part.id}</span>
                            {part.part_number && <span className="badge bg-info ms-1">#{part.part_number}</span>}
                            {part.parent_id && <span className="badge bg-secondary ms-1">Parent: {part.parent_id}</span>}
                            <br />
                            <small className="text-muted">{part.manufacturer}</small><br />
                            <small>Stock: {part.available_stock} | Rs {part.recommended_price || 0}</small>
                          </div>
                          <div className="btn-group-vertical">
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => addToCart(part)}
                            >
                              Add to Cart
                            </button>
                            <button
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => {
                                setReservationData({
                                  ...reservationData,
                                  part_id: part.id,
                                  price_agreed: part.recommended_price || 0
                                });
                                setShowReservationModal(true);
                              }}
                            >
                              Reserve
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bills Section */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5>Sales History</h5>
          <div className="col-md-4">
            <input
              type="text"
              className="form-control"
              placeholder="Search bills by number, customer name, or phone"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="card-body">
          {bills.length === 0 ? (
            <div className="text-muted text-center">No bills found</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Bill #</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Items</th>
                    <th>Total Qty</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map(bill => (
                    <tr key={bill.id}>
                      <td>{bill.bill_number || bill.id}</td>
                      <td>{new Date(bill.date).toLocaleDateString()}</td>
                      <td>{bill.customer_name}</td>
                      <td>{bill.customer_phone || '-'}</td>
                      <td>{bill.items ? bill.items.length : 0}</td>
                      <td>{bill.total_quantity}</td>
                      <td>Rs {parseFloat(bill.total_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                      <td>
                        <span className={`badge ${
                          bill.status === 'active' ? 'bg-success' :
                          bill.status === 'refunded' ? 'bg-danger' :
                          'bg-warning'
                        }`}>
                          {bill.status}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group">
                          <button className="btn btn-info btn-sm" onClick={() => printBill(bill)}>
                            Print
                          </button>
                          {(userRole === 'admin' || userRole === 'superadmin') && (
                            <>
                              <button className="btn btn-warning btn-sm" onClick={() => handleEditBill(bill)}>
                                Edit
                              </button>
                              {bill.status === 'active' && (
                                <button className="btn btn-danger btn-sm" onClick={() => handleRefund(bill)}>
                                  Refund
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Bill Modal */}
      {editingBill && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Bill #{editingBill.bill_number || editingBill.id}</h5>
                <button type="button" className="btn-close" onClick={() => setEditingBill(null)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Bill Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editBillData.bill_number}
                    onChange={e => setEditBillData({...editBillData, bill_number: e.target.value})}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Customer Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editBillData.customer_name}
                    onChange={e => setEditBillData({...editBillData, customer_name: e.target.value})}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Customer Phone</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={editBillData.customer_phone}
                    onChange={e => setEditBillData({...editBillData, customer_phone: e.target.value})}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingBill(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={saveEditBill}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundingBill && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Process Refund - Bill #{refundingBill.bill_number || refundingBill.id}</h5>
                <button type="button" className="btn-close" onClick={() => setRefundingBill(null)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Refund Amount</label>
                  <input
                    type="number"
                    className="form-control"
                    value={refundAmount}
                    onChange={e => setRefundAmount(e.target.value)}
                    min="0"
                    max={refundingBill.total_amount}
                    step="0.01"
                    required
                  />
                  <small className="text-muted">Maximum: Rs {refundingBill.total_amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</small>
                </div>
                <div className="mb-3">
                  <label className="form-label">Refund Reason</label>
                  <textarea
                    className="form-control"
                    value={refundReason}
                    onChange={e => setRefundReason(e.target.value)}
                    required
                    rows="3"
                  ></textarea>
                </div>
                <div className="alert alert-warning">
                  <strong>Note:</strong> Full refunds will restore stock quantities automatically.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setRefundingBill(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={processRefund}>
                  Process Refund
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reservation Modal */}
      {showReservationModal && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create Reservation</h5>
                <button type="button" className="btn-close" onClick={() => setShowReservationModal(false)}></button>
              </div>
              <form onSubmit={createReservation}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Customer Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={reservationData.customer_name}
                      onChange={e => setReservationData({...reservationData, customer_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Customer Phone *</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={reservationData.customer_phone}
                      onChange={e => setReservationData({...reservationData, customer_phone: e.target.value})}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Select Part *</label>
                    <select
                      className="form-control"
                      value={reservationData.part_id}
                      onChange={e => {
                        const partId = e.target.value;
                        const selectedPart = availableParts.find(part => part.id == partId);
                        setReservationData({
                          ...reservationData, 
                          part_id: partId,
                          price_agreed: selectedPart ? selectedPart.recommended_price || 0 : ''
                        });
                      }}
                      required
                    >
                      <option value="">Choose a part...</option>
                      {availableParts.map(part => (
                        <option key={part.id} value={part.id}>
                          ID:{part.id} - {part.name} - {part.manufacturer} 
                          {part.part_number && ` (#${part.part_number})`}
                          {part.parent_id && ` (Parent: ${part.parent_id})`} 
                          (Stock: {part.available_stock})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Quantity *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={reservationData.quantity}
                      onChange={e => setReservationData({...reservationData, quantity: parseInt(e.target.value) || 1})}
                      min="1"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Agreed Price (Rs) *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={reservationData.price_agreed}
                      onChange={e => setReservationData({...reservationData, price_agreed: e.target.value})}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Deposit Amount (Rs)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={reservationData.deposit_amount}
                      onChange={e => setReservationData({...reservationData, deposit_amount: parseFloat(e.target.value) || 0})}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      value={reservationData.notes}
                      onChange={e => setReservationData({...reservationData, notes: e.target.value})}
                      rows="3"
                      placeholder="Additional notes or special requirements..."
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowReservationModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Reservation'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sales;

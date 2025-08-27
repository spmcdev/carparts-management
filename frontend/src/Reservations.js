import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from './config/api';

// CSS styles for reservation search functionality
const reservationSearchStyles = `
  .hover-bg-light:hover {
    background-color: #f8f9fa !important;
    transition: background-color 0.2s ease;
  }
  
  .reservation-search-item {
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .reservation-search-item:hover {
    background-color: #e3f2fd;
    border-left: 4px solid #2196f3;
  }
`;

// Inject styles
if (typeof document !== 'undefined' && !document.getElementById('reservation-search-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'reservation-search-styles';
  styleSheet.innerText = reservationSearchStyles;
  document.head.appendChild(styleSheet);
}

function Reservations({ token, userRole }) {
  const [availableParts, setAvailableParts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [partSearchTerm, setPartSearchTerm] = useState('');
  const [searchParentIdOnly, setSearchParentIdOnly] = useState(false);

  // Reservation state (enhanced for multi-item support)
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservations, setReservations] = useState([]);
  const [showReservationHistory, setShowReservationHistory] = useState(false);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [processingReservation, setProcessingReservation] = useState(null);
  const [reservationData, setReservationData] = useState({
    customer_name: '',
    customer_phone: '',
    deposit_amount: 0,
    notes: ''
  });
  
  // Multi-item reservation cart
  const [reservationCartItems, setReservationCartItems] = useState([]);
  
  // Reservation parts search
  const [reservationPartSearchTerm, setReservationPartSearchTerm] = useState('');
  const [filteredReservationParts, setFilteredReservationParts] = useState([]);
  const [showReservationPartsList, setShowReservationPartsList] = useState(false);

  // Pagination state for reservations
  const [reservationPagination, setReservationPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  });

  // Check if part is a parent part
  const isParentPart = (part) => {
    return part && (part.is_parent === true || part.is_parent === 1);
  };

  useEffect(() => {
    fetchAvailableParts();
    fetchReservations();
  }, []);

  // Fetch available parts
  const fetchAvailableParts = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINTS.PARTS_AVAILABLE, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch available parts');
      const data = await res.json();
      setAvailableParts(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter parts based on search term
  const filterParts = (parts, searchTerm) => {
    if (!searchTerm) return parts;
    
    const searchTermLower = searchTerm.toLowerCase();
    return parts.filter(part => {
      if (searchParentIdOnly) {
        return part.parent_id && part.parent_id.toString().includes(searchTerm);
      } else {
        return (
          part.name?.toLowerCase().includes(searchTermLower) ||
          part.manufacturer?.toLowerCase().includes(searchTermLower) ||
          part.id?.toString().includes(searchTerm) ||
          part.part_number?.toLowerCase().includes(searchTermLower) ||
          part.parent_id?.toString().includes(searchTerm)
        );
      }
    });
  };

  const filteredParts = filterParts(availableParts, partSearchTerm);

  // RESERVATION FUNCTIONALITY

  // Fetch reservations
  const fetchReservations = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (showActiveOnly) {
        params.append('status', 'reserved');
      }
      
      const res = await fetch(`${API_ENDPOINTS.RESERVATIONS}?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch reservations');
      const data = await res.json();
      setReservations(data.reservations || []);
      setReservationPagination(data.pagination || {});
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle reservation search for parts
  const handleReservationPartSearch = (searchTerm) => {
    setReservationPartSearchTerm(searchTerm);
    if (searchTerm.length > 0) {
      const filtered = availableParts.filter(part =>
        part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.id.toString().includes(searchTerm) ||
        (part.part_number && part.part_number.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredReservationParts(filtered);
      setShowReservationPartsList(true);
    } else {
      setShowReservationPartsList(false);
    }
  };

  // Add part to reservation cart
  const addToReservationCart = (part) => {
    const existingItem = reservationCartItems.find(item => item.part_id === part.id);
    if (existingItem) {
      setReservationCartItems(items =>
        items.map(item =>
          item.part_id === part.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setReservationCartItems(items => [...items, {
        part_id: part.id,
        part_name: part.name,
        manufacturer: part.manufacturer,
        part_number: part.part_number,
        quantity: 1,
        unit_price: parseFloat(part.recommended_price) || 0,
        available_stock: part.stock_quantity || 0
      }]);
    }
    
    // Clear search
    setReservationPartSearchTerm('');
    setShowReservationPartsList(false);
    setSuccess(`${part.name} added to reservation`);
    setTimeout(() => setSuccess(''), 3000);
  };

  // Remove item from reservation cart
  const removeFromReservationCart = (partId) => {
    setReservationCartItems(items => items.filter(item => item.part_id !== partId));
  };

  // Update reservation cart item quantity
  const updateReservationCartQuantity = (partId, quantity) => {
    if (quantity <= 0) {
      removeFromReservationCart(partId);
      return;
    }
    
    setReservationCartItems(items =>
      items.map(item =>
        item.part_id === partId
          ? { ...item, quantity: parseInt(quantity) }
          : item
      )
    );
  };

  // Create reservation (enhanced for multi-item)
  const createReservation = async () => {
    if (!reservationData.customer_name) {
      setError('Customer name is required');
      return;
    }
    
    if (reservationCartItems.length === 0) {
      setError('Please add at least one part to the reservation');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(API_ENDPOINTS.RESERVATIONS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_name: reservationData.customer_name,
          customer_phone: reservationData.customer_phone,
          deposit_amount: parseFloat(reservationData.deposit_amount) || 0,
          notes: reservationData.notes,
          items: reservationCartItems.map(item => ({
            part_id: item.part_id,
            quantity: item.quantity,
            unit_price: item.unit_price
          }))
        })
      });
      
      if (!res.ok) throw new Error('Failed to create reservation');
      
      setSuccess('Reservation created successfully');
      setShowReservationModal(false);
      setReservationData({ customer_name: '', customer_phone: '', deposit_amount: 0, notes: '' });
      setReservationCartItems([]);
      fetchReservations();
      fetchAvailableParts();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Complete reservation
  const completeReservation = async (reservationId) => {
    if (!window.confirm('Are you sure you want to complete this reservation? This will create a sale.')) {
      return;
    }

    try {
      setProcessingReservation(reservationId);
      const res = await fetch(`${API_ENDPOINTS.RESERVATIONS}/${reservationId}/complete-enhanced`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to complete reservation');
      
      setSuccess('Reservation completed successfully');
      fetchReservations();
      fetchAvailableParts();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingReservation(null);
    }
  };

  // Cancel reservation
  const cancelReservation = async (reservationId) => {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) {
      return;
    }

    try {
      setProcessingReservation(reservationId);
      const res = await fetch(`${API_ENDPOINTS.RESERVATIONS}/${reservationId}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to cancel reservation');
      
      setSuccess('Reservation cancelled successfully');
      fetchReservations();
      fetchAvailableParts();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessingReservation(null);
    }
  };

  return (
    <div className="container-fluid mt-4">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">
            <i className="fas fa-calendar-check me-2"></i>
            Reservations Management
          </h2>

          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}

          {success && (
            <div className="alert alert-success alert-dismissible fade show" role="alert">
              <i className="fas fa-check-circle me-2"></i>
              {success}
              <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
            </div>
          )}

          {/* Available Parts Section */}
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h4 className="mb-0">
                <i className="fas fa-box me-2"></i>
                Available Parts
              </h4>
              <button 
                className="btn btn-primary position-relative"
                onClick={() => setShowReservationModal(true)}
              >
                <i className="fas fa-plus me-2"></i>
                Create Reservation
                {reservationCartItems.length > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {reservationCartItems.length}
                  </span>
                )}
              </button>
            </div>
            <div className="card-body">
              {/* Search and Filter Controls */}
              <div className="row mb-3">
                <div className="col-md-8">
                  <input
                    type="text"
                    className="form-control"
                    placeholder={searchParentIdOnly ? "Search by parent ID only..." : "Search by name, manufacturer, part ID, part number, or parent ID..."}
                    value={partSearchTerm}
                    onChange={(e) => setPartSearchTerm(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="searchParentIdOnly"
                      checked={searchParentIdOnly}
                      onChange={(e) => setSearchParentIdOnly(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="searchParentIdOnly">
                      Search by Parent ID only
                    </label>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Part Details</th>
                        <th>Part Number</th>
                        <th>Stock</th>
                        <th>Price</th>
                        <th>Container</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredParts.length > 0 ? (
                        filteredParts.map((part) => (
                          <tr key={part.id}>
                            <td>
                              <div>
                                <strong>{part.name}</strong>
                                {isParentPart(part) && (
                                  <span className="badge bg-warning text-dark ms-2">Parent Part</span>
                                )}
                                <br />
                                <small className="text-muted">{part.manufacturer}</small>
                                <br />
                                <small className="text-muted">ID: {part.id}</small>
                              </div>
                            </td>
                            <td>{part.part_number || 'N/A'}</td>
                            <td>
                              <span className={`badge ${part.stock_quantity > 0 ? 'bg-success' : 'bg-danger'}`}>
                                {part.stock_quantity || 0} units
                              </span>
                            </td>
                            <td>Rs {parseFloat(part.recommended_price || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                            <td>
                              <span className={`badge ${part.local_purchase ? 'bg-warning text-dark' : 'bg-info'}`}>
                                {part.local_purchase ? 'Local' : part.container_no || 'N/A'}
                              </span>
                            </td>
                            <td>
                              <button 
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => addToReservationCart(part)}
                                disabled={part.stock_quantity <= 0}
                              >
                                <i className="fas fa-calendar-plus me-1"></i>
                                Reserve
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center text-muted py-4">
                            {partSearchTerm ? 'No parts found matching your search.' : 'No parts available.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Reservations Section */}
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h4 className="mb-0">
                <i className="fas fa-list me-2"></i>
                Reservations
              </h4>
              <div className="d-flex gap-2">
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => setShowReservationHistory(!showReservationHistory)}
                >
                  {showReservationHistory ? 'Hide History' : 'Show History'}
                </button>
                <div className="form-check form-switch d-flex align-items-center">
                  <input
                    className="form-check-input me-2"
                    type="checkbox"
                    id="activeOnlySwitch"
                    checked={showActiveOnly}
                    onChange={(e) => {
                      setShowActiveOnly(e.target.checked);
                      fetchReservations(1);
                    }}
                  />
                  <label className="form-check-label" htmlFor="activeOnlySwitch">
                    Active Only
                  </label>
                </div>
              </div>
            </div>
            <div className="card-body">
              {showReservationHistory && (
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Total Amount</th>
                        <th>Deposit</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.length > 0 ? (
                        reservations.map((reservation) => (
                          <tr key={reservation.id}>
                            <td>
                              <div>
                                <strong>{reservation.customer_name}</strong>
                                {reservation.customer_phone && (
                                  <>
                                    <br />
                                    <small className="text-muted">{reservation.customer_phone}</small>
                                  </>
                                )}
                              </div>
                            </td>
                            <td>
                              <small>
                                {reservation.items ? (
                                  reservation.items.map((item, index) => (
                                    <div key={index}>
                                      {item.part_name} × {item.quantity}
                                    </div>
                                  ))
                                ) : (
                                  'No items'
                                )}
                              </small>
                            </td>
                            <td>Rs {parseFloat(reservation.total_amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                            <td>Rs {parseFloat(reservation.deposit_amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                            <td>
                              <span className={`badge ${
                                reservation.status === 'reserved' ? 'bg-success' :
                                reservation.status === 'completed' ? 'bg-primary' :
                                reservation.status === 'cancelled' ? 'bg-danger' : 'bg-secondary'
                              }`}>
                                {reservation.status}
                              </span>
                            </td>
                            <td>{new Date(reservation.created_at).toLocaleDateString()}</td>
                            <td>
                              {reservation.status === 'reserved' && (
                                <div className="btn-group btn-group-sm">
                                  {userRole === 'superadmin' && (
                                    <button 
                                      className="btn btn-success"
                                      onClick={() => completeReservation(reservation.id)}
                                      disabled={processingReservation === reservation.id}
                                    >
                                      <i className="fas fa-check me-1"></i>
                                      Complete
                                    </button>
                                  )}
                                  <button 
                                    className="btn btn-danger"
                                    onClick={() => cancelReservation(reservation.id)}
                                    disabled={processingReservation === reservation.id}
                                  >
                                    <i className="fas fa-times me-1"></i>
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="text-center text-muted py-4">
                            No reservations found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Reservation Modal */}
      {showReservationModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-calendar-plus me-2"></i>
                  Create New Reservation
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowReservationModal(false)}></button>
              </div>
              <div className="modal-body">
                <form>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Customer Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={reservationData.customer_name}
                        onChange={(e) => setReservationData({...reservationData, customer_name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Customer Phone</label>
                      <input
                        type="text"
                        className="form-control"
                        value={reservationData.customer_phone}
                        onChange={(e) => setReservationData({...reservationData, customer_phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Deposit Amount</label>
                      <input
                        type="number"
                        className="form-control"
                        step="0.01"
                        value={reservationData.deposit_amount}
                        onChange={(e) => setReservationData({...reservationData, deposit_amount: e.target.value})}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Notes</label>
                      <input
                        type="text"
                        className="form-control"
                        value={reservationData.notes}
                        onChange={(e) => setReservationData({...reservationData, notes: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  {/* Part Search */}
                  <div className="mb-3">
                    <label className="form-label">Add Parts to Reservation</label>
                    <div className="position-relative">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search parts by name, manufacturer, part number, or ID..."
                        value={reservationPartSearchTerm}
                        onChange={(e) => handleReservationPartSearch(e.target.value)}
                      />
                      {showReservationPartsList && filteredReservationParts.length > 0 && (
                        <div className="list-group position-absolute w-100" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                          {filteredReservationParts.slice(0, 10).map((part) => (
                            <button
                              key={part.id}
                              type="button"
                              className="list-group-item list-group-item-action reservation-search-item hover-bg-light"
                              onClick={() => addToReservationCart(part)}
                            >
                              <div className="d-flex justify-content-between align-items-start">
                                <div>
                                  <strong>{part.name}</strong>
                                  {isParentPart(part) && (
                                    <span className="badge bg-warning text-dark ms-2">Parent</span>
                                  )}
                                  <br />
                                  <small className="text-muted">{part.manufacturer}</small>
                                  <br />
                                  <small className="text-muted">Part #: {part.part_number || 'N/A'}</small>
                                </div>
                                <div className="text-end">
                                  <span className="badge bg-success">Stock: {part.stock_quantity}</span>
                                  <br />
                                  <small>Rs {parseFloat(part.recommended_price || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</small>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Reservation Cart */}
                  {reservationCartItems.length > 0 && (
                    <div className="mb-3">
                      <h6>Reservation Items</h6>
                      <div className="table-responsive">
                        <table className="table table-sm">
                          <thead>
                            <tr>
                              <th>Part</th>
                              <th>Part Number</th>
                              <th>Quantity</th>
                              <th>Unit Price</th>
                              <th>Total</th>
                              <th></th>
                            </tr>
                          </thead>
                          <tbody>
                            {reservationCartItems.map((item) => (
                              <tr key={item.part_id}>
                                <td>
                                  <strong>{item.part_name}</strong>
                                  <br />
                                  <small className="text-muted">{item.manufacturer}</small>
                                </td>
                                <td>{item.part_number || 'N/A'}</td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    style={{ width: '80px' }}
                                    value={item.quantity}
                                    min="1"
                                    max={item.available_stock}
                                    onChange={(e) => updateReservationCartQuantity(item.part_id, e.target.value)}
                                  />
                                </td>
                                <td>Rs {item.unit_price.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                                <td>Rs {(item.quantity * item.unit_price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => removeFromReservationCart(item.part_id)}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr>
                              <th colSpan="4">Total Amount:</th>
                              <th>Rs {reservationCartItems.reduce((total, item) => total + (item.quantity * item.unit_price), 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</th>
                              <th></th>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowReservationModal(false)}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={createReservation}
                  disabled={loading || !reservationData.customer_name || reservationCartItems.length === 0}
                >
                  {loading ? 'Creating...' : 'Create Reservation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reservations;

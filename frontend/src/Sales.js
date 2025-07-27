import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from './config/api';

function Sales({ token, userRole }) {
  const [availableParts, setAvailableParts] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [partSearchTerm, setPartSearchTerm] = useState('');
  const [searchParentIdOnly, setSearchParentIdOnly] = useState(false);
  const [showSalesHistory, setShowSalesHistory] = useState(true);
  
  // Pagination state for bills
  const [billsSearchTerm, setBillsSearchTerm] = useState('');
  const [billsSearchInput, setBillsSearchInput] = useState(''); // For the input field
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    hasNextPage: false,
    hasPreviousPage: false
  });
  
  // Sale form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [cartItems, setCartItems] = useState([]);
  
  // Edit bill modal state
  const [editingBill, setEditingBill] = useState(null);
  const [editBillData, setEditBillData] = useState({});
  const [editingBillItems, setEditingBillItems] = useState([]);
  const [newItemData, setNewItemData] = useState({
    part_id: '',
    quantity: 1,
    unit_price: ''
  });
  
  // Refund modal state
  const [refundingBill, setRefundingBill] = useState(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundItems, setRefundItems] = useState([]);
  const [refundType, setRefundType] = useState('full'); // 'full' or 'partial'

  // Bill details expansion state
  const [expandedBills, setExpandedBills] = useState(new Set());

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
  
  // Edit reservation modal state
  const [editingReservation, setEditingReservation] = useState(null);
  const [editReservationData, setEditReservationData] = useState({});
  const [editingReservationItems, setEditingReservationItems] = useState([]);
  const [newReservationItemData, setNewReservationItemData] = useState({
    part_id: '',
    quantity: 1,
    unit_price: ''
  });
  
  // Reservation details expansion state
  const [expandedReservations, setExpandedReservations] = useState(new Set());

  // Filter parts based on search term
  const filterParts = (parts, searchTerm) => {
    if (!searchTerm.trim()) return parts;
    
    const term = searchTerm.toLowerCase().trim();
    
    return parts.filter(part => {
      // If parent ID only search is enabled, only search by parent ID
      if (searchParentIdOnly) {
        return part.parent_id && (part.parent_id.toString() === term || part.parent_id.toString().startsWith(term));
      }
      
      // Otherwise, search by all fields as before
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

  // Fetch bills with pagination
  const fetchBills = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (search.trim()) {
        params.append('search', search.trim());
      }
      
      const res = await fetch(`${API_ENDPOINTS.BILLS}?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch bills');
      const data = await res.json();
      setBills(data.bills || []);
      setPagination(data.pagination || {});
      setCurrentPage(page);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle search input change (immediate UI update, debounced API call)
  const handleBillsSearchInput = (inputValue) => {
    setBillsSearchInput(inputValue);
    // Don't trigger search immediately - let useEffect handle debouncing
  };

  // Debounced search effect
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Only trigger search if the input value has changed
      if (billsSearchInput !== billsSearchTerm) {
        setBillsSearchTerm(billsSearchInput);
        setCurrentPage(1);
        fetchBills(1, billsSearchInput);
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [billsSearchInput]); // Only depend on input to avoid infinite loops

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      fetchBills(newPage, billsSearchTerm);
    }
  };

  // Fetch reservations
  const fetchReservations = async () => {
    try {
      const res = await fetch(`${API_ENDPOINTS.BASE}/api/reservations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch reservations');
      const data = await res.json();
      setReservations(data);
    } catch (err) {
      setError(err.message);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchAvailableParts();
    fetchBills();
    fetchReservations();
  }, [token]);

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

  // Enhanced reservation cart functions
  const addToReservationCart = (part) => {
    const existingIndex = reservationCartItems.findIndex(item => item.part_id === part.id);
    if (existingIndex >= 0) {
      setError('Part already in reservation cart');
      return;
    }
    
    const newItem = {
      part_id: part.id,
      part_name: part.name,
      manufacturer: part.manufacturer,
      quantity: 1,
      unit_price: part.recommended_price || 0,
      available_stock: part.available_stock
    };
    
    setReservationCartItems([...reservationCartItems, newItem]);
  };

  // Update reservation cart item quantity
  const updateReservationCartQuantity = (partId, quantity) => {
    const numQuantity = parseInt(quantity);
    if (numQuantity < 1 || isNaN(numQuantity)) return;
    
    setReservationCartItems(reservationCartItems.map(item => 
      item.part_id === partId 
        ? { ...item, quantity: numQuantity }
        : item
    ));
  };

  // Update reservation cart item price
  const updateReservationCartPrice = (partId, price) => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice < 0) return;
    
    setReservationCartItems(reservationCartItems.map(item => 
      item.part_id === partId 
        ? { ...item, unit_price: numPrice }
        : item
    ));
  };

  // Remove item from reservation cart
  const removeFromReservationCart = (partId) => {
    setReservationCartItems(reservationCartItems.filter(item => item.part_id !== partId));
  };

  // Calculate reservation total
  const calculateReservationTotal = () => {
    return reservationCartItems.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
  };

  // Create enhanced multi-item reservation
  const createReservation = async (e) => {
    e.preventDefault();
    console.log('Starting reservation creation...');
    console.log('Reservation data:', reservationData);
    console.log('API Base URL:', API_ENDPOINTS.BASE);
    
    // Test connectivity first
    try {
      console.log('Testing connectivity to backend...');
      const connectivityTest = await fetch(`${API_ENDPOINTS.BASE}/`, {
        method: 'GET'
      });
      console.log('Connectivity test status:', connectivityTest.status);
      if (connectivityTest.ok) {
        const response = await connectivityTest.text();
        console.log('Backend response:', response);
      }
    } catch (connectError) {
      console.error('Connectivity test failed:', connectError);
      setError('Cannot connect to backend server. Please check your connection.');
      return;
    }
    
    if (!reservationData.customer_name || !reservationData.customer_phone) {
      setError('Please fill in customer name and phone number');
      return;
    }

    if (reservationCartItems.length === 0) {
      setError('Please add at least one item to the reservation');
      return;
    }

    // Validate cart items
    console.log('Reservation cart items before validation:', reservationCartItems);
    for (const item of reservationCartItems) {
      console.log('Validating item:', item);
      
      // Ensure quantity and unit_price are numbers
      const quantity = Number(item.quantity);
      const unit_price = Number(item.unit_price);
      
      if (!quantity || quantity <= 0 || isNaN(quantity)) {
        setError(`Please set a valid quantity for ${item.part_name}`);
        return;
      }
      if (!unit_price || unit_price <= 0 || isNaN(unit_price)) {
        setError(`Please set a valid price for ${item.part_name}`);
        return;
      }
      if (quantity > item.available_stock) {
        setError(`Insufficient stock for ${item.part_name}. Available: ${item.available_stock}`);
        return;
      }
    }

    try {
      setLoading(true);
      setError('');
      
      const items = reservationCartItems.map(item => ({
        part_id: Number(item.part_id),
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price)
      }));

      const requestData = {
        ...reservationData,
        deposit_amount: Number(reservationData.deposit_amount) || 0,
        items
      };

      console.log('Creating reservation with data:', requestData);
      console.log('API Endpoint:', `${API_ENDPOINTS.BASE}/api/reservations`);

      const res = await fetch(`${API_ENDPOINTS.BASE}/api/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      console.log('Response status:', res.status);
      console.log('Response headers:', res.headers);

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Error response:', errorData);
        throw new Error(errorData.error || 'Failed to create reservation');
      }

      const newReservation = await res.json();
      setSuccess(`Reservation created! Reservation number: ${newReservation.reservation_number}`);
      
      // Reset form
      setReservationData({
        customer_name: '',
        customer_phone: '',
        deposit_amount: 0,
        notes: ''
      });
      setReservationCartItems([]);
      setShowReservationModal(false);
      
      // Refresh data
      fetchAvailableParts();
      fetchReservations();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Complete reservation (convert to sale)
  const completeReservation = async (reservation) => {
    try {
      setLoading(true);
      setError('');

      console.log('Completing reservation:', reservation);

      const res = await fetch(`${API_ENDPOINTS.BASE}/api/reservations/${reservation.id}/complete-enhanced`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          additional_amount: 0 // Can be modified later for additional charges
        })
      });

      console.log('Completion response status:', res.status);

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Completion error:', errorData);
        throw new Error(errorData.error || 'Failed to complete reservation');
      }

      const result = await res.json();
      console.log('Completion result:', result);
      
      setSuccess(`Reservation completed! Bill created: ${result.bill.bill_number}`);
      
      // Refresh data
      fetchReservations();
      fetchBills();
      fetchAvailableParts();
      setProcessingReservation(null);
      
    } catch (err) {
      console.error('Error completing reservation:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cancel reservation
  const cancelReservation = async (reservationId) => {
    try {
      setLoading(true);
      setError('');

      const res = await fetch(`${API_ENDPOINTS.BASE}/api/reservations/${reservationId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to cancel reservation');
      }

      setSuccess('Reservation cancelled successfully! Stock has been released.');
      
      // Refresh data
      fetchReservations();
      fetchAvailableParts();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced reservation management functions
  
  // Toggle reservation details expansion
  const toggleReservationDetails = (reservationId) => {
    const newExpanded = new Set(expandedReservations);
    if (newExpanded.has(reservationId)) {
      newExpanded.delete(reservationId);
    } else {
      newExpanded.add(reservationId);
    }
    setExpandedReservations(newExpanded);
  };

  // Edit reservation (Admin/SuperAdmin only)
  const editReservation = async (reservation) => {
    if (userRole !== 'admin' && userRole !== 'superadmin') {
      setError('Only admins can edit reservations');
      return;
    }

    setEditingReservation(reservation);
    setEditReservationData({
      customer_name: reservation.customer_name,
      customer_phone: reservation.customer_phone,
      deposit_amount: reservation.deposit_amount || 0,
      notes: reservation.notes || ''
    });
    
    // Set reservation items for editing
    const items = reservation.items || [];
    setEditingReservationItems(items.map(item => ({
      ...item,
      id: item.id,
      part_id: item.part_id,
      part_name: item.part_name,
      manufacturer: item.manufacturer,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price
    })));
  };

  // Update reservation basic info
  const updateReservation = async () => {
    try {
      setLoading(true);
      setError('');

      const res = await fetch(`${API_ENDPOINTS.BASE}/api/reservations/${editingReservation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editReservationData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update reservation');
      }

      setSuccess('Reservation updated successfully');
      setEditingReservation(null);
      fetchReservations();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add item to existing reservation
  const addReservationItem = async () => {
    if (!newReservationItemData.part_id || !newReservationItemData.quantity || !newReservationItemData.unit_price) {
      setError('Please fill in all fields for the new item');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await fetch(`${API_ENDPOINTS.BASE}/api/reservations/${editingReservation.id}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newReservationItemData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add item to reservation');
      }

      const newItem = await res.json();
      setEditingReservationItems([...editingReservationItems, newItem]);
      setNewReservationItemData({ part_id: '', quantity: 1, unit_price: '' });
      setSuccess('Item added to reservation successfully');
      fetchReservations();
      fetchAvailableParts();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update reservation item
  const updateReservationItem = async (itemId, quantity, unit_price) => {
    try {
      setLoading(true);
      setError('');

      const res = await fetch(`${API_ENDPOINTS.BASE}/api/reservations/${editingReservation.id}/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ quantity: parseInt(quantity), unit_price: parseFloat(unit_price) })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update reservation item');
      }

      const updatedItem = await res.json();
      setEditingReservationItems(editingReservationItems.map(item => 
        item.id === itemId ? updatedItem : item
      ));
      setSuccess('Reservation item updated successfully');
      fetchReservations();
      fetchAvailableParts();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete reservation item
  const deleteReservationItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to remove this item from the reservation?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await fetch(`${API_ENDPOINTS.BASE}/api/reservations/${editingReservation.id}/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete reservation item');
      }

      setEditingReservationItems(editingReservationItems.filter(item => item.id !== itemId));
      setSuccess('Reservation item removed successfully');
      fetchReservations();
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
    // Initialize bill items for editing (SuperAdmin only)
    if (userRole === 'superadmin') {
      setEditingBillItems(bill.items || []);
      setNewItemData({
        part_id: '',
        quantity: 1,
        unit_price: ''
      });
    }
  };

  const saveEditBill = async () => {
    try {
      setLoading(true);
      setError('');
      
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
      setEditBillData({});
      setEditingBillItems([]);
      setNewItemData({ part_id: '', quantity: 1, unit_price: '' });
      fetchBills();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Add bill item (SuperAdmin only)
  const addBillItem = async () => {
    if (!newItemData.part_id || !newItemData.quantity || !newItemData.unit_price) {
      setError('Please fill all item details');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_ENDPOINTS.BILLS}/${editingBill.id}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newItemData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add item');
      }

      const newItem = await res.json();
      setEditingBillItems([...editingBillItems, newItem]);
      setNewItemData({ part_id: '', quantity: 1, unit_price: '' });
      setSuccess('Item added successfully');
      
      // Refresh the bill to update total
      fetchBills();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update bill item (SuperAdmin only)
  const updateBillItem = async (itemId, updatedData) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_ENDPOINTS.BILLS}/${editingBill.id}/items/${itemId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update item');
      }

      const updatedItem = await res.json();
      setEditingBillItems(editingBillItems.map(item => 
        item.id === itemId ? updatedItem : item
      ));
      setSuccess('Item updated successfully');
      
      // Refresh the bill to update total
      fetchBills();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete bill item (SuperAdmin only)
  const deleteBillItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to remove this item from the bill?')) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const res = await fetch(`${API_ENDPOINTS.BILLS}/${editingBill.id}/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete item');
      }

      setEditingBillItems(editingBillItems.filter(item => item.id !== itemId));
      setSuccess('Item removed successfully');
      
      // Refresh the bill to update total
      fetchBills();
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update item quantity/price inline
  const handleItemChange = (itemId, field, value) => {
    setEditingBillItems(editingBillItems.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    ));
  };

  // Process refund
  const handleRefund = (bill) => {
    setRefundingBill(bill);
    setRefundAmount(bill.total_amount);
    setRefundReason('');
    setRefundType('full');
    // Initialize refund items with all bill items
    setRefundItems(bill.items.map(item => ({
      ...item,
      refund_quantity: 0,
      refund_unit_price: item.unit_price,
      refund_total: 0,
      selected: false
    })));
  };

  // Update refund item selection
  const updateRefundItemSelection = (itemIndex, selected) => {
    const updatedItems = refundItems.map((item, index) => {
      if (index === itemIndex) {
        const refund_quantity = selected ? item.quantity : 0;
        return {
          ...item,
          selected,
          refund_quantity,
          refund_total: refund_quantity * item.refund_unit_price
        };
      }
      return item;
    });
    setRefundItems(updatedItems);
    updateRefundAmount(updatedItems);
  };

  // Update refund item quantity
  const updateRefundItemQuantity = (itemIndex, quantity) => {
    const updatedItems = refundItems.map((item, index) => {
      if (index === itemIndex) {
        const refund_quantity = Math.min(Math.max(0, quantity), item.quantity);
        return {
          ...item,
          refund_quantity,
          refund_total: refund_quantity * item.refund_unit_price,
          selected: refund_quantity > 0
        };
      }
      return item;
    });
    setRefundItems(updatedItems);
    updateRefundAmount(updatedItems);
  };

  // Update refund item unit price
  const updateRefundItemPrice = (itemIndex, price) => {
    const updatedItems = refundItems.map((item, index) => {
      if (index === itemIndex) {
        const refund_unit_price = Math.max(0, parseFloat(price) || 0);
        return {
          ...item,
          refund_unit_price,
          refund_total: item.refund_quantity * refund_unit_price
        };
      }
      return item;
    });
    setRefundItems(updatedItems);
    updateRefundAmount(updatedItems);
  };

  // Calculate total refund amount from selected items
  const updateRefundAmount = (items) => {
    const total = items.reduce((sum, item) => sum + (item.selected ? item.refund_total : 0), 0);
    setRefundAmount(total.toFixed(2));
  };

  // Select all items for refund
  const selectAllRefundItems = () => {
    const updatedItems = refundItems.map(item => ({
      ...item,
      selected: true,
      refund_quantity: item.quantity,
      refund_total: item.quantity * item.refund_unit_price
    }));
    setRefundItems(updatedItems);
    updateRefundAmount(updatedItems);
  };

  // Clear all refund item selections
  const clearAllRefundItems = () => {
    const updatedItems = refundItems.map(item => ({
      ...item,
      selected: false,
      refund_quantity: 0,
      refund_total: 0
    }));
    setRefundItems(updatedItems);
    updateRefundAmount(updatedItems);
  };

  const processRefund = async () => {
    try {
      const refundData = {
        refund_reason: refundReason
      };

      if (refundType === 'full') {
        refundData.refund_amount = parseFloat(refundAmount);
      } else {
        // Partial refund - send selected items
        const selectedItems = refundItems.filter(item => item.selected && item.refund_quantity > 0);
        if (selectedItems.length === 0) {
          setError('Please select at least one item to refund');
          return;
        }
        
        refundData.refund_type = 'partial';
        refundData.refund_items = selectedItems.map(item => ({
          part_id: item.part_id,
          quantity: item.refund_quantity,
          unit_price: item.refund_unit_price,
          total_price: item.refund_total
        }));
        refundData.refund_amount = parseFloat(refundAmount);
      }

      const res = await fetch(`${API_ENDPOINTS.BILLS}/${refundingBill.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(refundData)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to process refund');
      }

      setSuccess('Refund processed successfully');
      setRefundingBill(null);
      setRefundAmount('');
      setRefundReason('');
      setRefundItems([]);
      setRefundType('full');
      fetchBills();
      fetchAvailableParts(); // Refresh in case stock was restored
    } catch (err) {
      setError(err.message);
    }
  };

  // Print bill
  const printBill = (bill) => {
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
          <title>Bill #${bill.bill_number || bill.id}</title>
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
            <p>Total Amount: Rs {parseFloat(bill.total_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
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

  // Toggle bill details expansion
  const toggleBillDetails = (billId) => {
    const newExpandedBills = new Set(expandedBills);
    if (newExpandedBills.has(billId)) {
      newExpandedBills.delete(billId);
    } else {
      newExpandedBills.add(billId);
    }
    setExpandedBills(newExpandedBills);
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
                className="btn btn-success btn-sm position-relative"
                onClick={() => setShowReservationModal(true)}
              >
                <i className="fas fa-bookmark me-1"></i>Make Reservation
                {reservationCartItems.length > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {reservationCartItems.length}
                  </span>
                )}
              </button>
            </div>
            <div className="card-body" style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {/* Search for parts */}
              <div className="mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder={searchParentIdOnly ? "Search by parent ID only..." : "Search by name, manufacturer, part ID, part number, or parent ID..."}
                  value={partSearchTerm}
                  onChange={(e) => setPartSearchTerm(e.target.value)}
                />
                <div className="d-flex align-items-center mt-2">
                  <div className="form-check me-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="searchParentIdOnly"
                      checked={searchParentIdOnly}
                      onChange={(e) => setSearchParentIdOnly(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="searchParentIdOnly">
                      Search by parent ID only
                    </label>
                  </div>
                </div>
                <small className="text-muted">
                  {searchParentIdOnly 
                    ? "💡 Searching only by parent ID (e.g., \"1\", \"23\")" 
                    : ""
                  }
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
                              className="btn btn-warning btn-sm"
                              onClick={() => addToReservationCart(part)}
                              title="Add to reservation cart"
                            >
                              <i className="fas fa-bookmark me-1"></i>Reserve
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
          <div className="d-flex align-items-center">
            <h5 className="mb-0 me-3">Sales History</h5>
            <button 
              className="btn btn-outline-primary btn-sm"
              onClick={() => setShowSalesHistory(!showSalesHistory)}
            >
              {showSalesHistory ? 'Hide Sales History' : 'Show Sales History'}
            </button>
          </div>
          {showSalesHistory && (
            <div className="col-md-4 position-relative">
              <input
                type="text"
                className="form-control"
                placeholder="Search bills by number, customer name, phone, or part name"
                value={billsSearchInput}
                onChange={e => handleBillsSearchInput(e.target.value)}
              />
              {billsSearchInput !== billsSearchTerm && (
                <small className="text-muted position-absolute" style={{right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px'}}>
                  Searching...
                </small>
              )}
            </div>
          )}
        </div>
        {showSalesHistory && (
          <div className="card-body">
            {bills.length === 0 && !loading ? (
              <div className="text-muted text-center">
                {billsSearchTerm ? 'No bills match your search' : 'No bills found'}
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                    <tr>
                      <th>Bill #</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Items</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map(bill => (
                    <React.Fragment key={bill.id}>
                      <tr>
                        <td>{bill.bill_number || bill.id}</td>
                        <td>{new Date(bill.date).toLocaleDateString()}</td>
                        <td>{bill.customer_name}</td>
                        <td>{bill.customer_phone || '-'}</td>
                        <td>
                          {bill.items && bill.items.length > 0 ? (
                            <div>
                              <span className="badge bg-info">{bill.items.length} items</span>
                              {bill.items.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="small text-muted">
                                  {item.part_name} ({item.quantity})
                                </div>
                              ))}
                              {bill.items.length > 2 && (
                                <div className="small text-muted">+ {bill.items.length - 2} more...</div>
                              )}
                            </div>
                          ) : (
                            <small className="text-muted">No items</small>
                          )}
                        </td>
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
                            <button 
                              className="btn btn-outline-primary btn-sm" 
                              onClick={() => toggleBillDetails(bill.id)}
                              title={expandedBills.has(bill.id) ? "Hide Details" : "View Details"}
                            >
                              <i className={`fas ${expandedBills.has(bill.id) ? 'fa-chevron-up' : 'fa-chevron-down'} me-1`}></i>
                              {expandedBills.has(bill.id) ? 'Hide' : 'Details'}
                            </button>
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
                      {expandedBills.has(bill.id) && (
                        <tr>
                          <td colSpan="8" className="p-0">
                            <div className="bg-light border-top">
                              <div className="p-3">
                                <h6 className="mb-3">
                                  <i className="fas fa-list me-2"></i>
                                  Bill Items Details
                                </h6>
                                {bill.items && bill.items.length > 0 ? (
                                  <div className="table-responsive">
                                    <table className="table table-sm table-striped mb-0">
                                      <thead className="table-dark">
                                        <tr>
                                          <th>Part Name</th>
                                          <th>Manufacturer</th>
                                          <th>Quantity</th>
                                          <th>Unit Price</th>
                                          <th>Total Price</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {bill.items.map((item, index) => (
                                          <tr key={index}>
                                            <td>
                                              <strong>{item.part_name}</strong>
                                              {item.part_id && (
                                                <small className="text-muted d-block">
                                                  ID: {item.part_id}
                                                </small>
                                              )}
                                            </td>
                                            <td>{item.manufacturer || 'N/A'}</td>
                                            <td>
                                              <span className="badge bg-primary">{item.quantity}</span>
                                            </td>
                                            <td>Rs {parseFloat(item.unit_price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                                            <td>
                                              <strong>Rs {parseFloat(item.total_price).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                      <tfoot className="table-warning">
                                        <tr>
                                          <td colSpan="2"><strong>Total</strong></td>
                                          <td><strong>{bill.total_quantity}</strong></td>
                                          <td></td>
                                          <td><strong>Rs {parseFloat(bill.total_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong></td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-muted text-center py-3">
                                    <i className="fas fa-exclamation-triangle me-2"></i>
                                    No items found for this bill
                                  </div>
                                )}
                                <div className="mt-3 row">
                                  <div className="col-md-6">
                                    <small className="text-muted">
                                      <strong>Bill Number:</strong> {bill.bill_number || bill.id}
                                    </small>
                                  </div>
                                  <div className="col-md-6 text-end">
                                    <small className="text-muted">
                                      <strong>Created:</strong> {new Date(bill.date).toLocaleString()}
                                    </small>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <div className="text-muted">
                  Showing page {pagination.page} of {pagination.pages} ({pagination.total} total bills)
                </div>
                <nav aria-label="Bills pagination">
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${!pagination.hasPreviousPage ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={!pagination.hasPreviousPage}
                      >
                        Previous
                      </button>
                    </li>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(pagination.pages, 5) }, (_, i) => {
                      const startPage = Math.max(1, currentPage - 2);
                      const pageNum = startPage + i;
                      if (pageNum <= pagination.pages) {
                        return (
                          <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                            <button 
                              className="page-link" 
                              onClick={() => handlePageChange(pageNum)}
                            >
                              {pageNum}
                            </button>
                          </li>
                        );
                      }
                      return null;
                    })}
                    
                    <li className={`page-item ${!pagination.hasNextPage ? 'disabled' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={!pagination.hasNextPage}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            )}
          </>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Reservation History Section */}
      <div className="card mt-4">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            <h5 className="mb-0 me-3">Reservation History</h5>
            <button 
              className="btn btn-outline-primary btn-sm"
              onClick={() => {
                setShowReservationHistory(!showReservationHistory);
                if (!showReservationHistory) fetchReservations();
              }}
            >
              {showReservationHistory ? 'Hide Reservations' : 'Show Reservations'}
            </button>
          </div>
        </div>
        {showReservationHistory && (
          <div className="card-body">
            <div className="mb-3 d-flex justify-content-between align-items-center">
              <div className="btn-group" role="group">
                <input 
                  type="radio" 
                  className="btn-check" 
                  name="reservationFilter" 
                  id="activeOnly" 
                  checked={showActiveOnly}
                  onChange={() => setShowActiveOnly(true)}
                />
                <label className="btn btn-outline-primary" htmlFor="activeOnly">Active Only</label>
                
                <input 
                  type="radio" 
                  className="btn-check" 
                  name="reservationFilter" 
                  id="showAll" 
                  checked={!showActiveOnly}
                  onChange={() => setShowActiveOnly(false)}
                />
                <label className="btn btn-outline-primary" htmlFor="showAll">All Reservations</label>
              </div>
              <small className="text-muted">
                {reservations.filter(r => showActiveOnly ? r.status === 'reserved' : true).length} reservation(s)
              </small>
            </div>
            
            {reservations.filter(r => showActiveOnly ? r.status === 'reserved' : true).length === 0 ? (
              <div className="text-muted text-center">
                {showActiveOnly ? 'No active reservations found' : 'No reservations found'}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Reservation #</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Phone</th>
                      <th>Items</th>
                      <th>Total Amount</th>
                      <th>Deposit</th>
                      <th>Balance</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservations
                      .filter(r => showActiveOnly ? r.status === 'reserved' : true)
                      .map(reservation => (
                      <React.Fragment key={reservation.id}>
                        <tr>
                          <td>
                            <div className="d-flex align-items-center">
                              <button
                                className="btn btn-sm btn-outline-secondary me-2"
                                onClick={() => toggleReservationDetails(reservation.id)}
                                title="Toggle details"
                              >
                                <i className={`fas fa-chevron-${expandedReservations.has(reservation.id) ? 'up' : 'down'}`}></i>
                              </button>
                              <div>
                                <strong>{reservation.reservation_number}</strong>
                                {reservation.notes && (
                                  <>
                                    <br/>
                                    <small className="text-muted">📝 Has notes</small>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>{new Date(reservation.reserved_date || reservation.created_at).toLocaleDateString()}</td>
                          <td>{reservation.customer_name}</td>
                          <td>{reservation.customer_phone}</td>
                          <td>
                            {reservation.items && reservation.items.length > 0 ? (
                              <div>
                                <span className="badge bg-info">{reservation.items.filter(item => item.id).length} items</span>
                                {reservation.items.filter(item => item.id).slice(0, 2).map((item, idx) => (
                                  <div key={idx} className="small text-muted">
                                    {item.part_name} ({item.quantity})
                                  </div>
                                ))}
                                {reservation.items.filter(item => item.id).length > 2 && (
                                  <div className="small text-muted">+ {reservation.items.filter(item => item.id).length - 2} more...</div>
                                )}
                              </div>
                            ) : (
                              <small className="text-muted">No items</small>
                            )}
                          </td>
                          <td>Rs. {parseFloat(reservation.total_amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                          <td>Rs. {parseFloat(reservation.deposit_amount || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                          <td>Rs. {parseFloat((reservation.total_amount || 0) - (reservation.deposit_amount || 0)).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                          <td>
                            <span className={`badge ${
                              reservation.status === 'reserved' ? 'bg-warning' :
                              reservation.status === 'completed' ? 'bg-success' :
                              reservation.status === 'cancelled' ? 'bg-danger' :
                              'bg-secondary'
                            }`}>
                              {reservation.status}
                            </span>
                            {reservation.completed_date && (
                              <>
                                <br />
                                <small className="text-muted">
                                  {new Date(reservation.completed_date).toLocaleDateString()}
                                </small>
                              </>
                            )}
                          </td>
                          <td>
                            <div className="btn-group-vertical" style={{ minWidth: '120px' }}>
                              {reservation.status === 'reserved' && (
                                <>
                                  <button 
                                    className="btn btn-success btn-sm" 
                                    onClick={() => setProcessingReservation(reservation)}
                                    title="Complete reservation"
                                  >
                                    <i className="fas fa-check me-1"></i>Complete
                                  </button>
                                  {(userRole === 'admin' || userRole === 'superadmin') && (
                                    <button 
                                      className="btn btn-warning btn-sm" 
                                      onClick={() => editReservation(reservation)}
                                      title="Edit reservation"
                                    >
                                      <i className="fas fa-edit me-1"></i>Edit
                                    </button>
                                  )}
                                  {(userRole === 'admin' || userRole === 'superadmin') && (
                                    <button 
                                      className="btn btn-danger btn-sm" 
                                      onClick={() => {
                                        if (window.confirm('Are you sure you want to cancel this reservation? This will release the reserved stock.')) {
                                          cancelReservation(reservation.id);
                                        }
                                      }}
                                      title="Cancel reservation"
                                    >
                                      <i className="fas fa-times me-1"></i>Cancel
                                    </button>
                                  )}
                                </>
                              )}
                              {reservation.notes && (
                                <button 
                                  className="btn btn-info btn-sm" 
                                  onClick={() => alert(`Notes: ${reservation.notes}`)}
                                  title="View notes"
                                >
                                  <i className="fas fa-sticky-note me-1"></i>Notes
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        
                        {/* Expanded Details Row */}
                        {expandedReservations.has(reservation.id) && (
                          <tr>
                            <td colSpan="10" className="bg-light">
                              <div className="p-3">
                                <h6>Reservation Items</h6>
                                {reservation.items && reservation.items.length > 0 ? (
                                  <div className="table-responsive">
                                    <table className="table table-sm table-borderless">
                                      <thead>
                                        <tr>
                                          <th>Part</th>
                                          <th>Manufacturer</th>
                                          <th>Quantity</th>
                                          <th>Unit Price</th>
                                          <th>Total Price</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {reservation.items.filter(item => item.id).map((item, idx) => (
                                          <tr key={idx}>
                                            <td><strong>{item.part_name}</strong></td>
                                            <td>{item.manufacturer}</td>
                                            <td>{item.quantity}</td>
                                            <td>Rs. {parseFloat(item.unit_price || 0).toFixed(2)}</td>
                                            <td>Rs. {parseFloat(item.total_price || 0).toFixed(2)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                      <tfoot>
                                        <tr>
                                          <th colSpan="4">Total:</th>
                                          <th>Rs. {parseFloat(reservation.total_amount || 0).toFixed(2)}</th>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-muted">No items in this reservation</p>
                                )}
                                
                                {reservation.notes && (
                                  <div className="mt-3">
                                    <h6>Notes</h6>
                                    <p className="text-muted">{reservation.notes}</p>
                                  </div>
                                )}
                                
                                <div className="mt-3">
                                  <small className="text-muted">
                                    Created by: {reservation.created_by_username} | 
                                    Created: {new Date(reservation.created_at || reservation.reserved_date).toLocaleString()}
                                    {reservation.completed_by_username && (
                                      <> | Completed by: {reservation.completed_by_username}</>
                                    )}
                                  </small>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Complete Reservation Modal */}
      {processingReservation && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Complete Reservation #{processingReservation.reservation_number}</h5>
                <button type="button" className="btn-close" onClick={() => setProcessingReservation(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <strong>Customer:</strong> {processingReservation.customer_name}<br />
                    <strong>Phone:</strong> {processingReservation.customer_phone}<br />
                    <strong>Part:</strong> {processingReservation.part_name || `ID: ${processingReservation.part_id}`}<br />
                  </div>
                  <div className="col-md-6">
                    <strong>Quantity:</strong> {processingReservation.quantity}<br />
                    <strong>Agreed Price:</strong> Rs {parseFloat(processingReservation.price_agreed).toLocaleString('en-LK', { minimumFractionDigits: 2 })}<br />
                    <strong>Deposit Paid:</strong> Rs {parseFloat(processingReservation.deposit_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}<br />
                  </div>
                </div>
                <hr />
                <div className="alert alert-info">
                  <strong>Remaining Amount to Collect:</strong> Rs {parseFloat(processingReservation.remaining_amount || processingReservation.price_agreed - processingReservation.deposit_amount).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </div>
                {processingReservation.notes && (
                  <div className="alert alert-secondary">
                    <strong>Notes:</strong> {processingReservation.notes}
                  </div>
                )}
                <p>Completing this reservation will:</p>
                <ul>
                  <li>Create a new sales bill</li>
                  <li>Transfer reserved stock to sold</li>
                  <li>Mark the reservation as completed</li>
                </ul>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setProcessingReservation(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-success" onClick={() => completeReservation(processingReservation)}>
                  Complete Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Bill Modal */}
      {editingBill && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className={`modal-dialog ${userRole === 'superadmin' ? 'modal-xl' : ''}`}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Bill #{editingBill.bill_number || editingBill.id}</h5>
                <button type="button" className="btn-close" onClick={() => {
                  setEditingBill(null);
                  setEditBillData({});
                  setEditingBillItems([]);
                  setNewItemData({ part_id: '', quantity: 1, unit_price: '' });
                }}></button>
              </div>
              <div className="modal-body">
                {/* Basic Bill Information */}
                <div className="row">
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">Bill Number</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editBillData.bill_number}
                        onChange={e => setEditBillData({...editBillData, bill_number: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
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
                  </div>
                  <div className="col-md-4">
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
                </div>

                {/* Update Basic Info Button */}
                <div className="d-flex justify-content-end mb-3">
                  <button type="button" className="btn btn-primary" onClick={saveEditBill} disabled={loading}>
                    {loading ? 'Updating...' : 'Update Basic Info'}
                  </button>
                </div>

                {/* SuperAdmin Bill Items Editing */}
                {userRole === 'superadmin' && (
                  <>
                    <hr />
                    <h6 className="mb-3">
                      <i className="fas fa-cog me-2"></i>
                      Bill Items Management (SuperAdmin)
                    </h6>
                    
                    {/* Add New Item */}
                    <div className="card mb-3">
                      <div className="card-header">
                        <h6 className="mb-0">
                          <i className="fas fa-plus me-2"></i>
                          Add New Item
                        </h6>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-4">
                            <select 
                              className="form-select"
                              value={newItemData.part_id}
                              onChange={e => setNewItemData({...newItemData, part_id: e.target.value})}
                            >
                              <option value="">Select Part</option>
                              {availableParts.map(part => (
                                <option key={part.id} value={part.id}>
                                  {part.name} - {part.manufacturer} (Stock: {part.available_stock})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-md-3">
                            <input
                              type="number"
                              className="form-control"
                              placeholder="Quantity"
                              value={newItemData.quantity}
                              onChange={e => setNewItemData({...newItemData, quantity: parseInt(e.target.value) || 1})}
                              min="1"
                            />
                          </div>
                          <div className="col-md-3">
                            <input
                              type="number"
                              className="form-control"
                              placeholder="Unit Price"
                              value={newItemData.unit_price}
                              onChange={e => setNewItemData({...newItemData, unit_price: e.target.value})}
                              step="0.01"
                              min="0"
                            />
                          </div>
                          <div className="col-md-2">
                            <button 
                              className="btn btn-success w-100" 
                              onClick={addBillItem}
                              disabled={loading || !newItemData.part_id || !newItemData.quantity || !newItemData.unit_price}
                            >
                              <i className="fas fa-plus"></i> Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Current Items */}
                    <div className="card">
                      <div className="card-header">
                        <h6 className="mb-0">
                          <i className="fas fa-list me-2"></i>
                          Current Items
                        </h6>
                      </div>
                      <div className="card-body">
                        {editingBillItems.length === 0 ? (
                          <p className="text-muted">No items in this bill</p>
                        ) : (
                          <div className="table-responsive">
                            <table className="table table-sm">
                              <thead>
                                <tr>
                                  <th>Part</th>
                                  <th>Quantity</th>
                                  <th>Unit Price</th>
                                  <th>Total</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {editingBillItems.map(item => (
                                  <tr key={item.id}>
                                    <td>
                                      <strong>{item.part_name}</strong><br />
                                      <small className="text-muted">{item.manufacturer}</small>
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        className="form-control form-control-sm"
                                        value={item.quantity}
                                        onChange={e => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                        min="1"
                                        style={{ width: '80px' }}
                                      />
                                    </td>
                                    <td>
                                      <input
                                        type="number"
                                        className="form-control form-control-sm"
                                        value={item.unit_price}
                                        onChange={e => handleItemChange(item.id, 'unit_price', e.target.value)}
                                        step="0.01"
                                        min="0"
                                        style={{ width: '100px' }}
                                      />
                                    </td>
                                    <td>
                                      <strong>Rs. {(item.quantity * item.unit_price).toFixed(2)}</strong>
                                    </td>
                                    <td>
                                      <div className="btn-group btn-group-sm">
                                        <button 
                                          className="btn btn-primary"
                                          onClick={() => updateBillItem(item.id, {
                                            quantity: item.quantity,
                                            unit_price: item.unit_price
                                          })}
                                          disabled={loading}
                                          title="Save changes"
                                        >
                                          <i className="fas fa-save me-1"></i>
                                          Save
                                        </button>
                                        <button 
                                          className="btn btn-danger"
                                          onClick={() => deleteBillItem(item.id)}
                                          disabled={loading}
                                          title="Remove item"
                                        >
                                          <i className="fas fa-trash me-1"></i>
                                          Remove
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="table-info">
                                  <th colSpan="3">Total:</th>
                                  <th>
                                    Rs. {editingBillItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}
                                  </th>
                                  <th></th>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setEditingBill(null);
                  setEditBillData({});
                  setEditingBillItems([]);
                  setNewItemData({ part_id: '', quantity: 1, unit_price: '' });
                }} disabled={loading}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundingBill && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Process Refund - Bill #{refundingBill.bill_number || refundingBill.id}</h5>
                <button type="button" className="btn-close" onClick={() => setRefundingBill(null)}></button>
              </div>
              <div className="modal-body">
                {/* Refund Type Selection */}
                <div className="mb-4">
                  <label className="form-label">Refund Type</label>
                  <div className="btn-group w-100" role="group">
                    <input 
                      type="radio" 
                      className="btn-check" 
                      name="refundType" 
                      id="fullRefund" 
                      checked={refundType === 'full'}
                      onChange={() => {
                        setRefundType('full');
                        setRefundAmount(refundingBill.total_amount);
                      }}
                    />
                    <label className="btn btn-outline-danger" htmlFor="fullRefund">Full Refund</label>
                    
                    <input 
                      type="radio" 
                      className="btn-check" 
                      name="refundType" 
                      id="partialRefund" 
                      checked={refundType === 'partial'}
                      onChange={() => {
                        setRefundType('partial');
                        clearAllRefundItems();
                      }}
                    />
                    <label className="btn btn-outline-warning" htmlFor="partialRefund">Partial Refund</label>
                  </div>
                </div>

                {/* Partial Refund Item Selection */}
                {refundType === 'partial' && (
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="mb-0">Select Items to Refund</h6>
                      <div className="btn-group btn-group-sm">
                        <button type="button" className="btn btn-outline-primary" onClick={selectAllRefundItems}>
                          Select All
                        </button>
                        <button type="button" className="btn btn-outline-secondary" onClick={clearAllRefundItems}>
                          Clear All
                        </button>
                      </div>
                    </div>
                    
                    <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      <table className="table table-sm table-bordered">
                        <thead className="table-dark sticky-top">
                          <tr>
                            <th width="50">Select</th>
                            <th>Part Name</th>
                            <th width="80">Sold Qty</th>
                            <th width="100">Refund Qty</th>
                            <th width="120">Unit Price</th>
                            <th width="120">Refund Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {refundItems.map((item, index) => (
                            <tr key={index} className={item.selected ? 'table-warning' : ''}>
                              <td>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={item.selected}
                                  onChange={e => updateRefundItemSelection(index, e.target.checked)}
                                />
                              </td>
                              <td>
                                <div>
                                  <strong>{item.part_name}</strong>
                                  {item.manufacturer && <><br /><small className="text-muted">{item.manufacturer}</small></>}
                                </div>
                              </td>
                              <td>
                                <span className="badge bg-info">{item.quantity}</span>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={item.refund_quantity}
                                  onChange={e => updateRefundItemQuantity(index, parseInt(e.target.value) || 0)}
                                  min="0"
                                  max={item.quantity}
                                  disabled={!item.selected}
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  className="form-control form-control-sm"
                                  value={item.refund_unit_price}
                                  onChange={e => updateRefundItemPrice(index, e.target.value)}
                                  min="0"
                                  step="0.01"
                                  disabled={!item.selected}
                                />
                              </td>
                              <td>
                                <strong>Rs {item.refund_total.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Refund Amount */}
                <div className="mb-3">
                  <label className="form-label">
                    {refundType === 'full' ? 'Full Refund Amount' : 'Total Refund Amount'}
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    value={refundAmount}
                    onChange={e => setRefundAmount(e.target.value)}
                    min="0"
                    max={refundingBill.total_amount}
                    step="0.01"
                    required
                    readOnly={refundType === 'partial'}
                  />
                  <small className="text-muted">
                    Maximum: Rs {refundingBill.total_amount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                    {refundType === 'partial' && ' (Amount calculated from selected items)'}
                  </small>
                </div>

                {/* Refund Reason */}
                <div className="mb-3">
                  <label className="form-label">Refund Reason</label>
                  <textarea
                    className="form-control"
                    value={refundReason}
                    onChange={e => setRefundReason(e.target.value)}
                    required
                    rows="3"
                    placeholder="Please provide a reason for the refund..."
                  ></textarea>
                </div>

                {/* Information Alert */}
                <div className="alert alert-info">
                  <h6><i className="fas fa-info-circle me-2"></i>Refund Information</h6>
                  <ul className="mb-0">
                    <li><strong>Full Refund:</strong> All items will be returned to stock and full amount refunded</li>
                    <li><strong>Partial Refund:</strong> Only selected quantities will be returned to stock</li>
                    <li><strong>Stock Adjustment:</strong> Returned items will automatically increase available stock</li>
                  </ul>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setRefundingBill(null)}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={processRefund}
                  disabled={refundType === 'partial' && refundItems.filter(item => item.selected).length === 0}
                >
                  <i className="fas fa-undo me-2"></i>
                  Process {refundType === 'full' ? 'Full' : 'Partial'} Refund
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Multi-Item Reservation Modal */}
      {showReservationModal && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create Multi-Item Reservation</h5>
                <button type="button" className="btn-close" onClick={() => setShowReservationModal(false)}></button>
              </div>
              <form onSubmit={createReservation}>
                <div className="modal-body">
                  {/* Customer Information */}
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Customer Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={reservationData.customer_name}
                        onChange={e => setReservationData({...reservationData, customer_name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Customer Phone *</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={reservationData.customer_phone}
                        onChange={e => setReservationData({...reservationData, customer_phone: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  {/* Part Selection */}
                  <div className="mb-3">
                    <label className="form-label">Add Parts to Reservation</label>
                    <div className="input-group">
                      <select
                        className="form-control"
                        onChange={e => {
                          const selectedPart = availableParts.find(part => part.id == e.target.value);
                          if (selectedPart) addToReservationCart(selectedPart);
                          e.target.value = '';
                        }}
                      >
                        <option value="">Choose a part to add...</option>
                        {availableParts
                          .filter(part => !reservationCartItems.some(item => item.part_id === part.id))
                          .map(part => (
                            <option key={part.id} value={part.id}>
                              ID:{part.id} - {part.name} - {part.manufacturer} 
                              {part.part_number && ` (#${part.part_number})`}
                              {part.parent_id && ` (Parent: ${part.parent_id})`} 
                              (Stock: {part.available_stock})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  {/* Reservation Cart */}
                  {reservationCartItems.length > 0 && (
                    <div className="mb-3">
                      <label className="form-label">Items in Reservation Cart</label>
                      <div className="table-responsive">
                        <table className="table table-sm table-striped">
                          <thead>
                            <tr>
                              <th>Part</th>
                              <th>Quantity</th>
                              <th>Unit Price (Rs)</th>
                              <th>Total (Rs)</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reservationCartItems.map((item, index) => (
                              <tr key={`${item.part_id}-${index}`}>
                                <td>
                                  <small>
                                    <strong>{item.part_name}</strong><br/>
                                    {item.manufacturer}<br/>
                                    <span className="text-muted">Available: {item.available_stock}</span>
                                  </small>
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    value={item.quantity}
                                    onChange={e => updateReservationCartQuantity(item.part_id, e.target.value)}
                                    min="1"
                                    max={item.available_stock}
                                    style={{ width: '80px' }}
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    value={item.unit_price}
                                    onChange={e => updateReservationCartPrice(item.part_id, e.target.value)}
                                    min="0"
                                    step="0.01"
                                    style={{ width: '100px' }}
                                  />
                                </td>
                                <td>
                                  <small>Rs. {(item.quantity * item.unit_price).toFixed(2)}</small>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
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
                              <th colSpan="3">Total Reservation Amount:</th>
                              <th>Rs. {calculateReservationTotal().toFixed(2)}</th>
                              <th></th>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Additional Information */}
                  <div className="row">
                    <div className="col-md-6">
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
                    <div className="col-md-6">
                      <label className="form-label">Notes</label>
                      <textarea
                        className="form-control"
                        value={reservationData.notes}
                        onChange={e => setReservationData({...reservationData, notes: e.target.value})}
                        rows="2"
                        placeholder="Additional notes..."
                      ></textarea>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowReservationModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success" disabled={loading || reservationCartItems.length === 0}>
                    {loading ? 'Creating...' : `Create Reservation (${reservationCartItems.length} items)`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Edit Reservation Modal */}
      {editingReservation && (
        <div className="modal show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Edit Reservation #{editingReservation.reservation_number}
                  {userRole === 'superadmin' && <span className="badge bg-warning ms-2">SuperAdmin</span>}
                </h5>
                <button type="button" className="btn-close" onClick={() => setEditingReservation(null)}></button>
              </div>
              <div className="modal-body">
                {/* Basic Reservation Info */}
                <div className="row mb-4">
                  <div className="col-md-3">
                    <label className="form-label">Customer Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editReservationData.customer_name || ''}
                      onChange={e => setEditReservationData({...editReservationData, customer_name: e.target.value})}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Customer Phone</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={editReservationData.customer_phone || ''}
                      onChange={e => setEditReservationData({...editReservationData, customer_phone: e.target.value})}
                    />
                  </div>
                  <div className="col-md-2">
                    <label className="form-label">Deposit (Rs)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={editReservationData.deposit_amount || 0}
                      onChange={e => setEditReservationData({...editReservationData, deposit_amount: parseFloat(e.target.value) || 0})}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Notes</label>
                    <textarea
                      className="form-control"
                      value={editReservationData.notes || ''}
                      onChange={e => setEditReservationData({...editReservationData, notes: e.target.value})}
                      rows="1"
                    />
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6>Reservation Items</h6>
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={updateReservation}
                    disabled={loading}
                  >
                    {loading ? 'Updating...' : 'Update Basic Info'}
                  </button>
                </div>

                {/* Reservation Items */}
                <div className="table-responsive mb-4">
                  <table className="table table-sm table-striped">
                    <thead>
                      <tr>
                        <th>Part Details</th>
                        <th style={{width: '100px'}}>Quantity</th>
                        <th style={{width: '120px'}}>Unit Price (Rs)</th>
                        <th style={{width: '120px'}}>Total (Rs)</th>
                        <th style={{width: '100px'}}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingReservationItems.map((item, index) => (
                        <tr key={item.id || index}>
                          <td>
                            <strong>{item.part_name}</strong><br/>
                            <small className="text-muted">{item.manufacturer}</small>
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              value={item.quantity}
                              onChange={e => {
                                const newItems = [...editingReservationItems];
                                newItems[index].quantity = parseInt(e.target.value) || 1;
                                newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
                                setEditingReservationItems(newItems);
                              }}
                              min="1"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="form-control form-control-sm"
                              value={item.unit_price}
                              onChange={e => {
                                const newItems = [...editingReservationItems];
                                newItems[index].unit_price = parseFloat(e.target.value) || 0;
                                newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
                                setEditingReservationItems(newItems);
                              }}
                              min="0"
                              step="0.01"
                            />
                          </td>
                          <td>
                            <span>Rs. {(item.quantity * item.unit_price).toFixed(2)}</span>
                          </td>
                          <td>
                            <div className="btn-group" role="group">
                              <button
                                type="button"
                                className="btn btn-warning btn-sm"
                                onClick={() => updateReservationItem(item.id, item.quantity, item.unit_price)}
                                disabled={loading}
                                title="Update Item"
                              >
                                <i className="fas fa-save me-1"></i>
                                Update
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => deleteReservationItem(item.id)}
                                disabled={loading}
                                title="Delete Item"
                              >
                                <i className="fas fa-trash me-1"></i>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th colSpan="3">Total Reservation Amount:</th>
                        <th>Rs. {editingReservationItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0).toFixed(2)}</th>
                        <th></th>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Add New Item */}
                <div className="border rounded p-3 bg-light">
                  <h6>Add New Item to Reservation</h6>
                  <div className="row">
                    <div className="col-md-5">
                      <label className="form-label">Select Part</label>
                      <select
                        className="form-control form-control-sm"
                        value={newReservationItemData.part_id}
                        onChange={e => {
                          const partId = e.target.value;
                          const selectedPart = availableParts.find(part => part.id == partId);
                          setNewReservationItemData({
                            ...newReservationItemData,
                            part_id: partId,
                            unit_price: selectedPart ? selectedPart.recommended_price || 0 : ''
                          });
                        }}
                      >
                        <option value="">Choose a part...</option>
                        {availableParts
                          .filter(part => !editingReservationItems.some(item => item.part_id === part.id))
                          .map(part => (
                            <option key={part.id} value={part.id}>
                              ID:{part.id} - {part.name} - {part.manufacturer} (Stock: {part.available_stock})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">Quantity</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={newReservationItemData.quantity}
                        onChange={e => setNewReservationItemData({...newReservationItemData, quantity: parseInt(e.target.value) || 1})}
                        min="1"
                      />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Unit Price (Rs)</label>
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={newReservationItemData.unit_price}
                        onChange={e => setNewReservationItemData({...newReservationItemData, unit_price: e.target.value})}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-md-2">
                      <label className="form-label">&nbsp;</label>
                      <div>
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={addReservationItem}
                          disabled={loading || !newReservationItemData.part_id}
                        >
                          Add Item
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingReservation(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Sales;

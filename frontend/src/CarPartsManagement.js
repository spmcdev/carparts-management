import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from './config/api';

function CarPartsManagement({ token, parts, fetchParts, loading, error, handleAddPart, userRole }) {
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [totalStock, setTotalStock] = useState('1');
  const [availableFrom, setAvailableFrom] = useState('');
  const [parentId, setParentId] = useState('');
  const [recommendedPrice, setRecommendedPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [editId, setEditId] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [editError, setEditError] = useState('');
  const [localPurchase, setLocalPurchase] = useState(false);
  const [containerNo, setContainerNo] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);

  // Filter parts based on search term and availability filter
  const filteredParts = parts.filter(part => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || (
      part.name.toLowerCase().includes(searchLower) ||
      part.manufacturer.toLowerCase().includes(searchLower) ||
      part.stock_status.toLowerCase().includes(searchLower) ||
      (part.container_no && part.container_no.toLowerCase().includes(searchLower)) ||
      (part.part_number && part.part_number.toLowerCase().includes(searchLower)) ||
      part.id.toString().includes(searchLower)
    );

    // Availability filter
    const matchesAvailability = !showAvailableOnly || (part.available_stock > 0);

    return matchesSearch && matchesAvailability;
  });

  useEffect(() => {
    fetchParts();
    // eslint-disable-next-line
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    const partData = { 
      name, 
      manufacturer, 
      part_number: partNumber || null,
      total_stock: parseInt(totalStock) || 1,
      available_from: availableFrom || new Date().toISOString().split('T')[0], // Set current date if not provided
      parent_id: parentId, 
      recommended_price: recommendedPrice, 
      local_purchase: localPurchase,
      container_no: containerNo
    };
    if (userRole === 'superadmin') partData.cost_price = costPrice;
    handleAddPart(partData);
    
    // Reset form
    setName('');
    setManufacturer('');
    setPartNumber('');
    setTotalStock('1');
    setAvailableFrom('');
    setParentId('');
    setRecommendedPrice('');
    setCostPrice('');
    setLocalPurchase(false);
    setContainerNo('');
  };

  const handleEdit = (part) => {
    setEditId(part.id);
    setEditFields({
      name: part.name,
      manufacturer: part.manufacturer,
      part_number: part.part_number || '',
      total_stock: part.total_stock,
      available_stock: part.available_stock,
      available_from: part.available_from || '',
      parent_id: part.parent_id || '',
      recommended_price: part.recommended_price || '',
      local_purchase: !!part.local_purchase,
      container_no: part.container_no || '',
      ...(userRole === 'superadmin' && { cost_price: part.cost_price || '' })
    });
    setEditError('');
  };

  const handleEditChange = (field, value) => {
    setEditFields({ ...editFields, [field]: value });
  };

  const handleEditCancel = () => {
    setEditId(null);
    setEditFields({});
    setEditError('');
  };

  const handleEditSave = async (id) => {
    setEditError('');
    try {
      const res = await fetch(`${API_ENDPOINTS.PARTS}/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(editFields)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update part');
      }
      setEditId(null);
      setEditFields({});
      fetchParts();
    } catch (err) {
      setEditError(err.message);
    }
  };

  const handleStockAdjustment = async (partId, currentStock, adjustment) => {
    if (!adjustment || adjustment === 0) return;
    
    try {
      const newStock = currentStock + parseInt(adjustment);
      if (newStock < 0) {
        alert('Cannot reduce stock below 0');
        return;
      }
      
      const res = await fetch(`${API_ENDPOINTS.PARTS}/${partId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ available_stock: newStock })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to adjust stock');
      }
      
      fetchParts();
    } catch (err) {
      alert(`Error adjusting stock: ${err.message}`);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setShowAvailableOnly(false);
  };

  return (
    <div className="container-fluid px-2 px-md-4">
      <h2 className="mb-4 fs-4 fs-md-2">Stock Management</h2>
      
      {/* Add Part Form */}
      <form onSubmit={onSubmit} className="row g-2 g-md-3 mb-3 align-items-end">
        <div className="col-12 col-md-2 mb-2 mb-md-0">
          <input 
            type="text" 
            className="form-control" 
            placeholder="Part Name" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            required 
          />
        </div>
        <div className="col-12 col-md-2 mb-2 mb-md-0">
          <input 
            type="text" 
            className="form-control" 
            placeholder="Manufacturer" 
            value={manufacturer} 
            onChange={e => setManufacturer(e.target.value)} 
            required 
          />
        </div>
        {userRole === 'superadmin' && (
          <div className="col-12 col-md-2 mb-2 mb-md-0">
            <input 
              type="number" 
              className="form-control" 
              placeholder="Cost Price (Rs)" 
              value={costPrice} 
              onChange={e => setCostPrice(e.target.value)} 
              min="0" 
              step="0.01" 
            />
          </div>
        )}
        <div className="col-12 col-md-2 mb-2 mb-md-0">
          <input 
            type="number" 
            className="form-control" 
            placeholder="Recommended Price (Rs)" 
            value={recommendedPrice} 
            onChange={e => setRecommendedPrice(e.target.value)} 
            min="0" 
            step="0.01" 
          />
        </div>
        <div className="col-12 col-md-1 mb-2 mb-md-0">
          <label className="form-label small mb-0">Qty</label>
          <input 
            type="number" 
            className="form-control" 
            placeholder="Qty" 
            value={totalStock} 
            onChange={e => setTotalStock(e.target.value)} 
            min="1" 
            required
          />
        </div>
        <div className="col-12 col-md-2 mb-2 mb-md-0">
          <input 
            type="text" 
            className="form-control" 
            placeholder="Part Number (Optional)" 
            value={partNumber} 
            onChange={e => setPartNumber(e.target.value)} 
          />
        </div>
        <div className="col-12 col-md-2 mb-2 mb-md-0">
          <label className="form-label">Available From</label>
          <input 
            type="date" 
            className="form-control" 
            value={availableFrom} 
            onChange={e => setAvailableFrom(e.target.value)} 
          />
        </div>
        <div className="col-12 col-md-1 mb-2 mb-md-0">
          <input 
            type="number" 
            className="form-control" 
            placeholder="Parent ID" 
            value={parentId} 
            onChange={e => setParentId(e.target.value)} 
            min="1" 
          />
        </div>
        <div className="col-12 col-md-1 mb-2 mb-md-0">
          <input 
            type="text" 
            className="form-control" 
            placeholder="Container" 
            value={containerNo} 
            onChange={e => setContainerNo(e.target.value)} 
          />
        </div>
        <div className="col-12 col-md-1 mb-2 mb-md-0 d-flex align-items-center">
          <input 
            type="checkbox" 
            className="form-check-input me-2" 
            id="localPurchase" 
            checked={localPurchase} 
            onChange={e => setLocalPurchase(e.target.checked)} 
          />
          <label htmlFor="localPurchase" className="form-check-label">Local</label>
        </div>
        <div className="col-12 col-md-1 d-grid">
          <button type="submit" className="btn btn-primary w-100">Add Part</button>
        </div>
      </form>

      {/* Search and Filters */}
      <div className="row mb-3">
        <div className="col-12 col-md-6">
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Search by name, manufacturer, part number, status, container, or ID"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {(searchTerm || showAvailableOnly) && (
              <button className="btn btn-outline-secondary" onClick={clearSearch}>
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div className="form-check d-flex align-items-center">
            <input
              className="form-check-input me-2"
              type="checkbox"
              id="showAvailableOnly"
              checked={showAvailableOnly}
              onChange={e => setShowAvailableOnly(e.target.checked)}
            />
            <label className="form-check-label mb-0" htmlFor="showAvailableOnly">
              Show only available stock
            </label>
          </div>
        </div>
      </div>

      {loading ? <div className="alert alert-info">Loading...</div> : null}
      {error && <div className="alert alert-danger">{error}</div>}
      {editError && <div className="alert alert-danger">{editError}</div>}
      
      {/* Parts Table */}
      <div className="table-responsive">
        <table className="table table-bordered table-striped align-middle text-nowrap fs-6">
          <thead className="table-dark">
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Manufacturer</th>
              <th>Part Number</th>
              <th>Total Stock</th>
              <th>Available</th>
              <th>Sold</th>
              <th>Reserved</th>
              <th>Status</th>
              <th>Available From</th>
              <th>Parent ID</th>
              <th>Recommended Price</th>
              <th>Container</th>
              <th>Local Purchase</th>
              {userRole === 'superadmin' && <th>Cost Price</th>}
              {(userRole === 'admin' || userRole === 'superadmin') && <th>Stock Actions</th>}
              {(userRole === 'admin' || userRole === 'superadmin') && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredParts.map(part => (
              <tr key={part.id}>
                <td>{part.id}</td>
                {editId === part.id ? (
                  <>
                    <td><input type="text" className="form-control" value={editFields.name} onChange={e => handleEditChange('name', e.target.value)} /></td>
                    <td><input type="text" className="form-control" value={editFields.manufacturer} onChange={e => handleEditChange('manufacturer', e.target.value)} /></td>
                    <td><input type="text" className="form-control" value={editFields.part_number} onChange={e => handleEditChange('part_number', e.target.value)} /></td>
                    <td><input type="number" className="form-control" value={editFields.total_stock} onChange={e => handleEditChange('total_stock', e.target.value)} min="0" /></td>
                    <td><input type="number" className="form-control" value={editFields.available_stock} onChange={e => handleEditChange('available_stock', e.target.value)} min="0" /></td>
                    <td>{part.sold_stock}</td>
                    <td>{part.reserved_stock}</td>
                    <td>
                      <span className={
                        part.available_stock > 0 ? 'badge bg-success' :
                        part.reserved_stock > 0 ? 'badge bg-warning text-dark' :
                        'badge bg-danger'
                      }>
                        {part.stock_status || (part.available_stock > 0 ? 'Available' : part.reserved_stock > 0 ? 'Reserved' : 'Sold')}
                      </span>
                    </td>
                    <td><input type="date" className="form-control" value={editFields.available_from} onChange={e => handleEditChange('available_from', e.target.value)} /></td>
                    <td><input type="number" className="form-control" value={editFields.parent_id} onChange={e => handleEditChange('parent_id', e.target.value)} min="1" /></td>
                    <td><input type="number" className="form-control" value={editFields.recommended_price} onChange={e => handleEditChange('recommended_price', e.target.value)} min="0" step="0.01" /></td>
                    <td><input type="text" className="form-control" value={editFields.container_no} onChange={e => handleEditChange('container_no', e.target.value)} /></td>
                    <td>
                      <input type="checkbox" className="form-check-input me-2" id={`localPurchaseEdit${part.id}`} checked={!!editFields.local_purchase} onChange={e => handleEditChange('local_purchase', e.target.checked)} />
                      <label htmlFor={`localPurchaseEdit${part.id}`} className="form-check-label">Local</label>
                    </td>
                    {userRole === 'superadmin' && (
                      <td><input type="number" className="form-control" value={editFields.cost_price} onChange={e => handleEditChange('cost_price', e.target.value)} min="0" step="0.01" /></td>
                    )}
                    {(userRole === 'admin' || userRole === 'superadmin') && (
                      <td>-</td>
                    )}
                    {(userRole === 'admin' || userRole === 'superadmin') && (
                      <td>
                        <button className="btn btn-success btn-sm me-2" onClick={() => handleEditSave(part.id)} type="button">Save</button>
                        <button className="btn btn-secondary btn-sm" onClick={handleEditCancel} type="button">Cancel</button>
                      </td>
                    )}
                  </>
                ) : (
                  <>
                    <td>{part.name}</td>
                    <td>{part.manufacturer}</td>
                    <td>{part.part_number || '-'}</td>
                    <td><strong>{part.total_stock}</strong></td>
                    <td className={part.available_stock > 0 ? 'text-success fw-bold' : 'text-muted'}>{part.available_stock}</td>
                    <td className={part.sold_stock > 0 ? 'text-danger fw-bold' : 'text-muted'}>{part.sold_stock}</td>
                    <td className={part.reserved_stock > 0 ? 'text-warning fw-bold' : 'text-muted'}>{part.reserved_stock}</td>
                    <td>
                      <span className={
                        part.available_stock > 0 ? 'badge bg-success' :
                        part.reserved_stock > 0 ? 'badge bg-warning text-dark' :
                        'badge bg-danger'
                      }>
                        {part.available_stock > 0 ? 'Available' : part.reserved_stock > 0 ? 'Reserved' : 'Sold Out'}
                      </span>
                    </td>
                    <td>{part.available_from ? part.available_from.slice(0, 10) : ''}</td>
                    <td>{part.parent_id || ''}</td>
                    <td>{
                      part.recommended_price !== null && part.recommended_price !== undefined
                        ? `Rs ${parseFloat(part.recommended_price).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                        : ''
                    }</td>
                    <td>{part.container_no || '-'}</td>
                    <td>{part.local_purchase ? 'Yes' : 'No'}</td>
                    {userRole === 'superadmin' && (
                      <td>{
                        part.cost_price !== null && part.cost_price !== undefined
                          ? `Rs ${parseFloat(part.cost_price).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                          : ''
                      }</td>
                    )}
                    {(userRole === 'admin' || userRole === 'superadmin') && (
                      <td>
                        <div className="btn-group-vertical btn-group-sm">
                          <button 
                            className="btn btn-outline-success btn-sm" 
                            onClick={() => {
                              const adjustment = prompt('Add stock (positive number):');
                              if (adjustment) handleStockAdjustment(part.id, part.available_stock, parseInt(adjustment));
                            }}
                          >
                            +Stock
                          </button>
                          <button 
                            className="btn btn-outline-danger btn-sm" 
                            onClick={() => {
                              const adjustment = prompt('Reduce stock (positive number):');
                              if (adjustment) handleStockAdjustment(part.id, part.available_stock, -parseInt(adjustment));
                            }}
                          >
                            -Stock
                          </button>
                        </div>
                      </td>
                    )}
                    {(userRole === 'admin' || userRole === 'superadmin') && (
                      <td>
                        <button className="btn btn-warning btn-sm" onClick={() => handleEdit(part)} type="button">Edit</button>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {filteredParts.length === 0 && (searchTerm || showAvailableOnly) && (
        <div className="alert alert-info">
          No parts found {searchTerm && `matching "${searchTerm}"`} 
          {searchTerm && showAvailableOnly && ' and '}
          {showAvailableOnly && 'with available stock'}
        </div>
      )}
    </div>
  );
}

export default CarPartsManagement;

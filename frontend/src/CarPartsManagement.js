import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from './config/api';

function CarPartsManagement({ token, parts, fetchParts, loading, error, handleAddPart, userRole }) {
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [stockStatus, setStockStatus] = useState('available');
  const [availableFrom, setAvailableFrom] = useState('');
  const [soldDate, setSoldDate] = useState('');
  const [parentId, setParentId] = useState('');
  const [recommendedPrice, setRecommendedPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [containerNo, setContainerNo] = useState('');
  const [editId, setEditId] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [editError, setEditError] = useState('');
  const [localPurchase, setLocalPurchase] = useState(false);
  
  // Search functionality
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredParts, setFilteredParts] = useState([]);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    key: 'id',
    direction: 'desc' // Default to show newest first
  });

  useEffect(() => {
    fetchParts();
    // eslint-disable-next-line
  }, []);

  // Search filtering effect
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredParts(parts);
    } else {
      const filtered = parts.filter(part => {
        const searchLower = searchTerm.toLowerCase();
        return (
          part.name?.toLowerCase().includes(searchLower) ||
          part.manufacturer?.toLowerCase().includes(searchLower) ||
          part.stock_status?.toLowerCase().includes(searchLower) ||
          part.container_no?.toLowerCase().includes(searchLower) ||
          part.id?.toString().includes(searchLower) ||
          part.parent_id?.toString().includes(searchLower)
        );
      });
      setFilteredParts(filtered);
    }
  }, [parts, searchTerm]);

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Sorting functions
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedParts = () => {
    const partsToSort = filteredParts.length > 0 || searchTerm ? filteredParts : parts;
    if (!sortConfig.key) return partsToSort;
    
    return [...partsToSort].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      // Handle null/undefined values
      if (aValue == null) aValue = '';
      if (bValue == null) bValue = '';
      
      // Handle numeric values
      if (sortConfig.key === 'id' || sortConfig.key === 'parent_id' || 
          sortConfig.key === 'recommended_price' || sortConfig.key === 'cost_price' || 
          sortConfig.key === 'sold_price') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }
      
      // Handle string values (case insensitive)
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toString().toLowerCase();
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <span className="text-muted ms-1">⇅</span>;
    }
    return sortConfig.direction === 'asc' ? 
      <span className="text-white ms-1">↑</span> : 
      <span className="text-white ms-1">↓</span>;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    // If Available Date is left blank, set it to today's date
    const finalAvailableFrom = availableFrom || getTodayDate();
    
    const partData = { 
      name, 
      manufacturer, 
      stock_status: stockStatus, 
      available_from: finalAvailableFrom, 
      sold_date: soldDate, 
      parent_id: parentId, 
      recommended_price: recommendedPrice, 
      local_purchase: localPurchase,
      container_no: containerNo
    };
    if (userRole === 'superadmin') partData.cost_price = costPrice;
    handleAddPart(partData);
    setName('');
    setManufacturer('');
    setStockStatus('available');
    setAvailableFrom('');
    setSoldDate('');
    setParentId('');
    setRecommendedPrice('');
    setCostPrice('');
    setContainerNo('');
    setLocalPurchase(false);
  };

  const handleEdit = (part) => {
    setEditId(part.id);
    setEditFields({
      name: part.name,
      manufacturer: part.manufacturer,
      stock_status: part.stock_status,
      available_from: part.available_from || '',
      sold_date: part.sold_date || '',
      parent_id: part.parent_id || '',
      recommended_price: part.recommended_price || '',
      sold_price: part.sold_price || '',
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
      if (!res.ok) throw new Error('Failed to update part');
      setEditId(null);
      setEditFields({});
      fetchParts();
    } catch (err) {
      setEditError('Failed to update part.');
    }
  };

  return (
    <div className="container-fluid px-2 px-md-4">
      <h2 className="mb-4 fs-4 fs-md-2">Car Parts Management</h2>
      <form onSubmit={onSubmit} className="row g-2 g-md-3 mb-3 align-items-end">
        <div className="col-12 col-md-2 mb-2 mb-md-0">
          <input type="text" className="form-control" placeholder="Part Name" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="col-12 col-md-2 mb-2 mb-md-0">
          <input type="text" className="form-control" placeholder="Manufacturer" value={manufacturer} onChange={e => setManufacturer(e.target.value)} required />
        </div>
        {userRole === 'superadmin' && (
          <div className="col-12 col-md-2 mb-2 mb-md-0">
            <input type="number" className="form-control" placeholder="Cost Price (SuperAdmin only)" value={costPrice} onChange={e => setCostPrice(e.target.value)} min="0" step="0.01" />
          </div>
        )}
        <div className="col-12 col-md-2 mb-2 mb-md-0">
          <input type="number" className="form-control" placeholder="Recommended Price" value={recommendedPrice} onChange={e => setRecommendedPrice(e.target.value)} min="0" step="0.01" />
        </div>
        <div className="col-12 col-md-2 mb-2 mb-md-0">
          <input type="text" className="form-control" placeholder="Container No" value={containerNo} onChange={e => setContainerNo(e.target.value)} />
        </div>
        <div className="col-12 col-md-2 mb-2 mb-md-0 d-flex align-items-center">
          <input type="checkbox" className="form-check-input me-2" id="localPurchase" checked={localPurchase} onChange={e => setLocalPurchase(e.target.checked)} />
          <label htmlFor="localPurchase" className="form-check-label">Local Purchase</label>
        </div>
        <div className="col-12 col-md-2 mb-2 mb-md-0">
          <input type="number" className="form-control" placeholder="Parent Part ID (optional)" value={parentId} onChange={e => setParentId(e.target.value)} min="1" />
        </div>
        <div className="col-12 col-md-2 mb-2 mb-md-0">
          <select className="form-select" value={stockStatus} onChange={e => setStockStatus(e.target.value)}>
            <option value="available">Available</option>
            <option value="sold">Sold</option>
            <option value="reserved">Reserved</option>
          </select>
        </div>
        <div className="col-12 col-md-2 mb-2 mb-md-0">
          <label className="form-label">Available From</label>
          <input 
            type="date" 
            className="form-control" 
            placeholder={`Available From (default: ${getTodayDate()})`}
            title={`Leave blank to use today's date (${getTodayDate()})`}
            value={availableFrom} 
            onChange={e => setAvailableFrom(e.target.value)} 
          />
        </div>
        <div className="col-12 col-md-2 mb-2 mb-md-0">
          <label className="form-label">Sold Date</label>
          <input type="date" className="form-control" placeholder="Sold Date" value={soldDate} onChange={e => setSoldDate(e.target.value)} />
        </div>
        <div className="col-12 col-md-1 d-grid">
          <button type="submit" className="btn btn-primary w-100">Add Part</button>
        </div>
      </form>
      {loading ? <div className="alert alert-info">Loading...</div> : null}
      {error && <div className="alert alert-danger">{error}</div>}
      {editError && <div className="alert alert-danger">{editError}</div>}
      
      {/* Search functionality */}
      <div className="row mb-3">
        <div className="col-12 col-md-6">
          <div className="input-group">
            <span className="input-group-text">
              <i className="fas fa-search"></i>
            </span>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search by part name, manufacturer, stock status, container number, or ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className="btn btn-outline-secondary" 
                type="button"
                onClick={() => setSearchTerm('')}
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="col-12 col-md-6 d-flex align-items-center">
          <small className="text-muted">
            {searchTerm ? `Found ${filteredParts.length} of ${parts.length} parts` : `Total: ${parts.length} parts`}
          </small>
        </div>
      </div>
      
      <div className="table-responsive">
        <table className="table table-bordered table-striped align-middle text-nowrap fs-6">
          <thead className="table-dark">
            <tr>
              <th 
                role="button" 
                onClick={() => handleSort('id')} 
                className="user-select-none"
                style={{ cursor: 'pointer' }}
              >
                ID{getSortIcon('id')}
              </th>
              <th 
                role="button" 
                onClick={() => handleSort('name')} 
                className="user-select-none"
                style={{ cursor: 'pointer' }}
              >
                Part Name{getSortIcon('name')}
              </th>
              <th 
                role="button" 
                onClick={() => handleSort('manufacturer')} 
                className="user-select-none"
                style={{ cursor: 'pointer' }}
              >
                Manufacturer{getSortIcon('manufacturer')}
              </th>
              {userRole === 'superadmin' && (
                <th 
                  role="button" 
                  onClick={() => handleSort('cost_price')} 
                  className="user-select-none"
                  style={{ cursor: 'pointer' }}
                >
                  Cost Price{getSortIcon('cost_price')}
                </th>
              )}
              <th 
                role="button" 
                onClick={() => handleSort('recommended_price')} 
                className="user-select-none"
                style={{ cursor: 'pointer' }}
              >
                Recommended Price{getSortIcon('recommended_price')}
              </th>
              <th 
                role="button" 
                onClick={() => handleSort('container_no')} 
                className="user-select-none"
                style={{ cursor: 'pointer' }}
              >
                Container No{getSortIcon('container_no')}
              </th>
              <th 
                role="button" 
                onClick={() => handleSort('local_purchase')} 
                className="user-select-none"
                style={{ cursor: 'pointer' }}
              >
                Local Purchase{getSortIcon('local_purchase')}
              </th>
              <th 
                role="button" 
                onClick={() => handleSort('parent_id')} 
                className="user-select-none"
                style={{ cursor: 'pointer' }}
              >
                Parent ID{getSortIcon('parent_id')}
              </th>
              <th 
                role="button" 
                onClick={() => handleSort('stock_status')} 
                className="user-select-none"
                style={{ cursor: 'pointer' }}
              >
                Stock Status{getSortIcon('stock_status')}
              </th>
              <th 
                role="button" 
                onClick={() => handleSort('available_from')} 
                className="user-select-none"
                style={{ cursor: 'pointer' }}
              >
                Available From{getSortIcon('available_from')}
              </th>
              <th 
                role="button" 
                onClick={() => handleSort('sold_date')} 
                className="user-select-none"
                style={{ cursor: 'pointer' }}
              >
                Sold Date{getSortIcon('sold_date')}
              </th>
              {(userRole === 'admin' || userRole === 'superadmin') && (
                <th 
                  role="button" 
                  onClick={() => handleSort('sold_price')} 
                  className="user-select-none"
                  style={{ cursor: 'pointer' }}
                >
                  Sold Price{getSortIcon('sold_price')}
                </th>
              )}
              {(userRole === 'admin' || userRole === 'superadmin') && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {getSortedParts().map(part => (
              <tr key={part.id}>
                <td>{part.id}</td>
                {editId === part.id ? (
                  <>
                    <td><input type="text" className="form-control" value={editFields.name} onChange={e => handleEditChange('name', e.target.value)} /></td>
                    <td><input type="text" className="form-control" value={editFields.manufacturer} onChange={e => handleEditChange('manufacturer', e.target.value)} /></td>
                    {userRole === 'superadmin' && (
                      <td><input type="number" className="form-control" value={editFields.cost_price} onChange={e => handleEditChange('cost_price', e.target.value)} min="0" step="0.01" /></td>
                    )}
                    <td><input type="number" className="form-control" value={editFields.recommended_price} onChange={e => handleEditChange('recommended_price', e.target.value)} min="0" step="0.01" /></td>
                    <td><input type="text" className="form-control" value={editFields.container_no} onChange={e => handleEditChange('container_no', e.target.value)} /></td>
                    <td>
                      <input type="checkbox" className="form-check-input me-2" id={`localPurchaseEdit${part.id}`} checked={!!editFields.local_purchase} onChange={e => handleEditChange('local_purchase', e.target.checked)} />
                      <label htmlFor={`localPurchaseEdit${part.id}`} className="form-check-label">Local</label>
                    </td>
                    <td><input type="number" className="form-control" value={editFields.parent_id} onChange={e => handleEditChange('parent_id', e.target.value)} min="1" /></td>
                    <td>
                      <select className="form-select" value={editFields.stock_status} onChange={e => handleEditChange('stock_status', e.target.value)}>
                        <option value="available">Available</option>
                        <option value="sold">Sold</option>
                        <option value="reserved">Reserved</option>
                      </select>
                    </td>
                    <td><input type="date" className="form-control" value={editFields.available_from} onChange={e => handleEditChange('available_from', e.target.value)} /></td>
                    <td><input type="date" className="form-control" value={editFields.sold_date} onChange={e => handleEditChange('sold_date', e.target.value)} /></td>
                    {(userRole === 'admin' || userRole === 'superadmin') && (
                      <td><input type="number" className="form-control" value={editFields.sold_price} onChange={e => handleEditChange('sold_price', e.target.value)} min="0" step="0.01" /></td>
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
                    {userRole === 'superadmin' && (
                      <td>{
                        part.cost_price !== null && part.cost_price !== undefined
                          ? `Rs. ${parseFloat(part.cost_price).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                          : ''
                      }</td>
                    )}
                    <td>{
                      part.recommended_price !== null && part.recommended_price !== undefined
                        ? `Rs. ${parseFloat(part.recommended_price).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                        : ''
                    }</td>
                    <td>{part.container_no || ''}</td>
                    <td>{part.local_purchase ? 'Yes' : 'No'}</td>
                    <td>{part.parent_id || ''}</td>
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
                    {(userRole === 'admin' || userRole === 'superadmin') && (
                      <td>{
                        part.sold_price !== null && part.sold_price !== undefined
                          ? `Rs. ${parseFloat(part.sold_price).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}`
                          : ''
                      }</td>
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
    </div>
  );
}

export default CarPartsManagement;

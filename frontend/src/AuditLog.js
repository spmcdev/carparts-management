import React, { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from './config/api';

function AuditLog({ token }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [filters, setFilters] = useState({
    table_name: '',
    action: '',
    username: '',
    limit: 50,
    offset: 0
  });
  const [totalCount, setTotalCount] = useState(0);
  const [availableFilters, setAvailableFilters] = useState({
    tables: [],
    actions: []
  });

  // Fetch available filter options
  const fetchFilterOptions = useCallback(async () => {
    try {
      const res = await fetch(API_ENDPOINTS.AUDIT_LOGS_FILTERS, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setAvailableFilters(data);
      }
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
      // Set fallback options if fetch fails
      setAvailableFilters({
        tables: ['parts', 'users', 'bills', 'reservations', 'bill_items', 'reservation_items', 'reserved_bills'],
        actions: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'SELL', 'CREATE_RESERVATION', 'UPDATE_RESERVATION', 'COMPLETE_RESERVATION', 'CANCEL_RESERVATION', 'ADD_BILL_ITEM', 'UPDATE_BILL_ITEM', 'DELETE_BILL_ITEM', 'ADD_RESERVATION_ITEM', 'UPDATE_RESERVATION_ITEM', 'DELETE_RESERVATION_ITEM', 'PARTIAL_REFUND', 'FULL_REFUND']
      });
    }
  }, [token]);

  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          queryParams.append(key, filters[key]);
        }
      });
      
      const res = await fetch(`${API_ENDPOINTS.AUDIT_LOGS}?${queryParams.toString()}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      
      if (!res.ok) {
        throw new Error('Failed to fetch audit logs');
      }
      
      const data = await res.json();
      setAuditLogs(data.logs);
      setTotalCount(data.total);
    } catch (err) {
      setError(err.message || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => {
    fetchFilterOptions();
    fetchAuditLogs();
  }, [fetchFilterOptions, fetchAuditLogs]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      offset: 0 // Reset offset when filtering
    }));
  };

  const handleNextPage = () => {
    setFilters(prev => ({
      ...prev,
      offset: prev.offset + prev.limit
    }));
  };

  const handlePrevPage = () => {
    setFilters(prev => ({
      ...prev,
      offset: Math.max(0, prev.offset - prev.limit)
    }));
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatValues = (values) => {
    if (!values) return null;
    if (typeof values === 'string') {
      try {
        values = JSON.parse(values);
      } catch {
        return values;
      }
    }
    return values;
  };

  const formatValuesSummary = (values) => {
    if (!values) return 'N/A';
    if (typeof values === 'string') {
      try {
        values = JSON.parse(values);
      } catch {
        return values;
      }
    }
    const entries = Object.entries(values);
    if (entries.length === 0) return 'N/A';
    if (entries.length === 1) return `${entries[0][0]}: ${entries[0][1]}`;
    return `${entries.length} field${entries.length > 1 ? 's' : ''} changed`;
  };

  const toggleRowExpansion = (logId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const renderValueDetails = (values, label) => {
    if (!values) return null;
    
    const parsedValues = formatValues(values);
    if (!parsedValues || typeof parsedValues !== 'object') {
      return (
        <div className="mt-2">
          <small className="text-muted fw-bold">{label}:</small>
          <div className="ms-3">
            <code className="text-dark">{parsedValues || 'N/A'}</code>
          </div>
        </div>
      );
    }

    return (
      <div className="mt-2">
        <small className="text-muted fw-bold">{label}:</small>
        <div className="ms-3">
          {Object.entries(parsedValues).map(([key, value]) => (
            <div key={key} className="d-flex align-items-start mb-1">
              <span className="badge bg-light text-dark me-2" style={{ minWidth: '80px' }}>
                {key}
              </span>
              <code className="text-dark flex-grow-1">
                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
              </code>
            </div>
          ))}
        </div>
      </div>
    );
  };

    // Helper function to format table names for display
  const formatTableName = (tableName) => {
    const tableDescriptions = {
      'parts': 'Parts (Inventory)',
      'users': 'Users (System Access)', 
      'bills': 'Bills (Sales)',
      'reservations': 'Reservations (Customer Holds)',
      'bill_items': 'Bill Items (Sale Details)',
      'reservation_items': 'Reservation Items (Hold Details)',
      'reserved_bills': 'Reserved Bills (Hold to Sale)'
    };
    
    return tableDescriptions[tableName] || tableName.charAt(0).toUpperCase() + tableName.slice(1).replace('_', ' ');
  };

  const getActionBadgeClass = (action) => {
    switch (action) {
      case 'CREATE': 
      case 'CREATE_RESERVATION':
      case 'ADD_BILL_ITEM':
      case 'ADD_RESERVATION_ITEM':
        return 'badge bg-success';
      case 'UPDATE': 
      case 'UPDATE_RESERVATION':
      case 'UPDATE_BILL_ITEM':
      case 'UPDATE_RESERVATION_ITEM':
        return 'badge bg-warning';
      case 'DELETE': 
      case 'DELETE_BILL_ITEM':
      case 'DELETE_RESERVATION_ITEM':
        return 'badge bg-danger';
      case 'LOGIN':
        return 'badge bg-primary';
      case 'SELL':
        return 'badge bg-info';
      case 'COMPLETE_RESERVATION':
        return 'badge bg-success';
      case 'CANCEL_RESERVATION':
        return 'badge bg-secondary';
      case 'PARTIAL_REFUND':
      case 'FULL_REFUND':
        return 'badge bg-warning text-dark';
      default: 
        return 'badge bg-secondary';
    }
  };

  return (
    <div className="container-fluid px-2 px-md-4">
      <div className="card p-2 p-md-4 mt-4 shadow-sm">
        <h2 className="mb-3 fs-4 fs-md-2">Audit Log</h2>
        
        {/* Filters */}
        <div className="card mb-4">
          <div className="card-header">
            <h5>Filters</h5>
          </div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-3">
                <label className="form-label">Table</label>
                <select 
                  className="form-select"
                  value={filters.table_name}
                  onChange={e => handleFilterChange('table_name', e.target.value)}
                >
                  <option value="">All Tables</option>
                  {availableFilters.tables.map(table => (
                    <option key={table} value={table}>
                      {formatTableName(table)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Action</label>
                <select 
                  className="form-select"
                  value={filters.action}
                  onChange={e => handleFilterChange('action', e.target.value)}
                >
                  <option value="">All Actions</option>
                  {availableFilters.actions.map(action => (
                    <option key={action} value={action}>
                      {action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Username</label>
                <input 
                  type="text"
                  className="form-control"
                  placeholder="Filter by username"
                  value={filters.username}
                  onChange={e => handleFilterChange('username', e.target.value)}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Items per page</label>
                <select 
                  className="form-select"
                  value={filters.limit}
                  onChange={e => handleFilterChange('limit', parseInt(e.target.value))}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Loading and Error States */}
        {loading && <div className="alert alert-info">Loading audit logs...</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        {/* Results Summary */}
        {!loading && !error && (
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center">
              <p className="text-muted mb-0">
                Showing {filters.offset + 1} to {Math.min(filters.offset + filters.limit, totalCount)} of {totalCount} entries
              </p>
              
              {/* Active Filters Summary */}
              {(filters.table_name || filters.action || filters.username) && (
                <div className="d-flex align-items-center gap-2">
                  <small className="text-muted">Active filters:</small>
                  {filters.table_name && (
                    <span className="badge bg-secondary">
                      Table: {formatTableName(filters.table_name)}
                    </span>
                  )}
                  {filters.action && (
                    <span className="badge bg-info">
                      Action: {filters.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  )}
                  {filters.username && (
                    <span className="badge bg-warning text-dark">
                      User: {filters.username}
                    </span>
                  )}
                  <button 
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setFilters({
                      table_name: '',
                      action: '',
                      username: '',
                      limit: filters.limit,
                      offset: 0
                    })}
                    title="Clear all filters"
                  >
                    <i className="fas fa-times"></i> Clear
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Logs Table */}
        {auditLogs.length > 0 && (
          <div className="table-responsive">
            <table className="table table-bordered table-striped mt-3 align-middle">
              <thead className="table-dark">
                <tr>
                  <th style={{ width: '50px' }}>Details</th>
                  <th style={{ width: '180px' }}>Timestamp</th>
                  <th style={{ width: '120px' }}>User</th>
                  <th style={{ width: '100px' }}>Action</th>
                  <th style={{ width: '100px' }}>Table</th>
                  <th style={{ width: '80px' }}>Record ID</th>
                  <th style={{ width: '200px' }}>Changes Summary</th>
                  <th style={{ width: '120px' }}>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <React.Fragment key={log.id}>
                    <tr>
                      <td className="text-center">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => toggleRowExpansion(log.id)}
                          title="Toggle details"
                        >
                          {expandedRows.has(log.id) ? (
                            <i className="fas fa-chevron-up"></i>
                          ) : (
                            <i className="fas fa-chevron-down"></i>
                          )}
                        </button>
                      </td>
                      <td className="text-nowrap small">{formatTimestamp(log.timestamp)}</td>
                      <td className="fw-bold">{log.username}</td>
                      <td>
                        <span className={getActionBadgeClass(log.action)}>
                          {log.action}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-secondary">{log.table_name}</span>
                      </td>
                      <td className="text-center">{log.record_id}</td>
                      <td className="small">
                        {log.action === 'UPDATE' ? (
                          <div>
                            <div className="text-muted">Old: {formatValuesSummary(log.old_values)}</div>
                            <div className="text-success">New: {formatValuesSummary(log.new_values)}</div>
                          </div>
                        ) : log.action === 'CREATE' ? (
                          <div className="text-success">
                            Created: {formatValuesSummary(log.new_values)}
                          </div>
                        ) : log.action === 'DELETE' ? (
                          <div className="text-danger">
                            Deleted: {formatValuesSummary(log.old_values)}
                          </div>
                        ) : (
                          <div>
                            {formatValuesSummary(log.new_values) || formatValuesSummary(log.old_values)}
                          </div>
                        )}
                      </td>
                      <td className="small">{log.ip_address || 'N/A'}</td>
                    </tr>
                    
                    {/* Expanded Details Row */}
                    {expandedRows.has(log.id) && (
                      <tr>
                        <td colSpan="8" className="bg-light">
                          <div className="p-3">
                            <div className="row">
                              <div className="col-md-6">
                                <h6 className="text-primary">
                                  <i className="fas fa-info-circle me-2"></i>
                                  Action Details
                                </h6>
                                <div className="mb-3">
                                  <small className="text-muted">Action:</small>
                                  <div className="ms-3">
                                    <span className={getActionBadgeClass(log.action)}>{log.action}</span>
                                  </div>
                                </div>
                                <div className="mb-3">
                                  <small className="text-muted">Table:</small>
                                  <div className="ms-3">
                                    <span className="badge bg-secondary">{log.table_name}</span>
                                  </div>
                                </div>
                                <div className="mb-3">
                                  <small className="text-muted">Record ID:</small>
                                  <div className="ms-3">
                                    <code className="text-dark">{log.record_id}</code>
                                  </div>
                                </div>
                                <div className="mb-3">
                                  <small className="text-muted">Timestamp:</small>
                                  <div className="ms-3">
                                    <code className="text-dark">{formatTimestamp(log.timestamp)}</code>
                                  </div>
                                </div>
                                <div className="mb-3">
                                  <small className="text-muted">User:</small>
                                  <div className="ms-3">
                                    <span className="badge bg-info">{log.username}</span>
                                  </div>
                                </div>
                                <div className="mb-3">
                                  <small className="text-muted">IP Address:</small>
                                  <div className="ms-3">
                                    <code className="text-dark">{log.ip_address || 'N/A'}</code>
                                  </div>
                                </div>
                                {log.user_agent && (
                                  <div className="mb-3">
                                    <small className="text-muted">User Agent:</small>
                                    <div className="ms-3">
                                      <small className="text-muted font-monospace">
                                        {log.user_agent}
                                      </small>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              <div className="col-md-6">
                                <h6 className="text-primary">
                                  <i className="fas fa-database me-2"></i>
                                  Data Changes
                                </h6>
                                
                                {log.old_values && renderValueDetails(log.old_values, "Previous Values")}
                                {log.new_values && renderValueDetails(log.new_values, "New Values")}
                                
                                {!log.old_values && !log.new_values && (
                                  <div className="alert alert-info">
                                    <small>No detailed change information available</small>
                                  </div>
                                )}
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
        )}

        {/* Pagination */}
        {totalCount > filters.limit && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <button 
              className="btn btn-outline-primary"
              onClick={handlePrevPage}
              disabled={filters.offset === 0}
            >
              Previous
            </button>
            
            <span className="text-muted">
              Page {Math.floor(filters.offset / filters.limit) + 1} of {Math.ceil(totalCount / filters.limit)}
            </span>
            
            <button 
              className="btn btn-outline-primary"
              onClick={handleNextPage}
              disabled={filters.offset + filters.limit >= totalCount}
            >
              Next
            </button>
          </div>
        )}

        {/* No results */}
        {!loading && !error && auditLogs.length === 0 && (
          <div className="alert alert-info mt-3">
            No audit logs found matching your criteria.
          </div>
        )}
      </div>
    </div>
  );
}

export default AuditLog;

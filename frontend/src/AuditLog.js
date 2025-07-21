import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from './config/api';

function AuditLog({ token }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    table_name: '',
    action: '',
    username: '',
    limit: 50,
    offset: 0
  });
  const [totalCount, setTotalCount] = useState(0);

  const fetchAuditLogs = async () => {
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
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [token, filters]);

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
    if (!values) return 'N/A';
    if (typeof values === 'string') {
      try {
        values = JSON.parse(values);
      } catch {
        return values;
      }
    }
    return Object.entries(values).map(([key, value]) => 
      `${key}: ${value}`
    ).join(', ');
  };

  const getActionBadgeClass = (action) => {
    switch (action) {
      case 'CREATE': return 'badge bg-success';
      case 'UPDATE': return 'badge bg-warning';
      case 'DELETE': return 'badge bg-danger';
      case 'SELL': return 'badge bg-info';
      default: return 'badge bg-secondary';
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
                  <option value="parts">Parts</option>
                  <option value="users">Users</option>
                  <option value="bills">Bills</option>
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
                  <option value="CREATE">Create</option>
                  <option value="UPDATE">Update</option>
                  <option value="DELETE">Delete</option>
                  <option value="SELL">Sell</option>
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
            <p className="text-muted">
              Showing {filters.offset + 1} to {Math.min(filters.offset + filters.limit, totalCount)} of {totalCount} entries
            </p>
          </div>
        )}

        {/* Audit Logs Table */}
        {auditLogs.length > 0 && (
          <div className="table-responsive">
            <table className="table table-bordered table-striped mt-3 align-middle text-nowrap">
              <thead className="table-dark">
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Table</th>
                  <th>Record ID</th>
                  <th>Old Values</th>
                  <th>New Values</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td className="text-nowrap">{formatTimestamp(log.timestamp)}</td>
                    <td>{log.username}</td>
                    <td>
                      <span className={getActionBadgeClass(log.action)}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.table_name}</td>
                    <td>{log.record_id}</td>
                    <td className="small" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {formatValues(log.old_values)}
                    </td>
                    <td className="small" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {formatValues(log.new_values)}
                    </td>
                    <td>{log.ip_address || 'N/A'}</td>
                  </tr>
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

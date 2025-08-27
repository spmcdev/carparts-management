import React, { useState, useEffect, useCallback } from 'react';
import { API_ENDPOINTS } from './config/api';

function Admin({ token, userRole }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userActivities, setUserActivities] = useState({});
  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('general');
  
  // Password update state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordUpdateUserId, setPasswordUpdateUserId] = useState(null);
  const [passwordUpdateUsername, setPasswordUpdateUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  const fetchUsers = useCallback(async () => {
    setError('');
    try {
      const res = await fetch(API_ENDPOINTS.USERS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
      
      // Fetch activity data for each user
      const activitiesPromises = data.map(async (user) => {
        try {
          const actRes = await fetch(`${API_ENDPOINTS.USERS}/${user.id}/activities`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (actRes.ok) {
            const actData = await actRes.json();
            return { userId: user.id, ...actData };
          }
        } catch (err) {
          console.error(`Failed to fetch activities for user ${user.id}:`, err);
        }
        return { userId: user.id, hasActivities: false };
      });
      
      const activitiesResults = await Promise.all(activitiesPromises);
      const activitiesMap = {};
      activitiesResults.forEach(result => {
        activitiesMap[result.userId] = result;
      });
      setUserActivities(activitiesMap);
    } catch (err) {
      setError('Failed to fetch users.');
    }
  }, [token]);

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'superadmin') fetchUsers();
  }, [userRole, fetchUsers]);

  const handleRoleChange = async (id, newRole) => {
    setError(''); setSuccess('');
    
    // Find the user to check their current role
    const user = users.find(u => u.id === id);
    if (!user) {
      setError('User not found.');
      return;
    }
    
    // Prevent admin from modifying superadmin users
    if (userRole === 'admin' && user.role === 'superadmin') {
      setError('Cannot modify superadmin users.');
      return;
    }
    
    try {
      const res = await fetch(`${API_ENDPOINTS.USERS}/${id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) throw new Error('Failed to update role');
      setSuccess('Role updated!');
      fetchUsers();
    } catch (err) {
      setError('Failed to update role.');
    }
  };

  const handleDelete = async (id) => {
    setError(''); setSuccess('');
    
    // Find the user to check their current role
    const user = users.find(u => u.id === id);
    if (!user) {
      setError('User not found.');
      return;
    }
    
    // Prevent admin from deleting superadmin users
    if (userRole === 'admin' && user.role === 'superadmin') {
      setError('Cannot delete superadmin users.');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const res = await fetch(`${API_ENDPOINTS.USERS}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        if (errorData.hasActivities) {
          setError(`Cannot delete user with activities. Use deactivate instead. Activities: ${errorData.activities.auditLogs} audit logs, ${errorData.activities.billsCreated} bills created, ${errorData.activities.reservationsCreated} reservations created.`);
        } else {
          throw new Error(errorData.error || 'Failed to delete user');
        }
        return;
      }
      
      setSuccess('User deleted!');
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to delete user.');
    }
  };

  const handleDeactivate = async (id) => {
    setError(''); setSuccess('');
    
    const user = users.find(u => u.id === id);
    if (!user) {
      setError('User not found.');
      return;
    }
    
    // Prevent admin from deactivating superadmin users
    if (userRole === 'admin' && user.role === 'superadmin') {
      setError('Cannot deactivate superadmin users.');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to deactivate user "${user.username}"? They will not be able to login.`)) {
      return;
    }
    
    try {
      const res = await fetch(`${API_ENDPOINTS.USERS}/${id}/deactivate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to deactivate user');
      }
      setSuccess('User deactivated!');
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to deactivate user.');
    }
  };

  const handleReactivate = async (id) => {
    setError(''); setSuccess('');
    
    const user = users.find(u => u.id === id);
    if (!user) {
      setError('User not found.');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to reactivate user "${user.username}"?`)) {
      return;
    }
    
    try {
      const res = await fetch(`${API_ENDPOINTS.USERS}/${id}/reactivate`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to reactivate user');
      }
      setSuccess('User reactivated!');
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to reactivate user.');
    }
  };

  // Add user from admin form
  const handleAddUser = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!newUsername || !newPassword) {
      setError('Username and password required.');
      return;
    }
    try {
      const res = await fetch(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');
      setSuccess('User created!');
      setNewUsername('');
      setNewPassword('');
      setNewRole('general');
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to create user.');
    }
  };

  // SuperAdmin-only: Update user password
  const handlePasswordUpdate = async () => {
    setError(''); setSuccess('');
    
    if (!newUserPassword || newUserPassword.trim().length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    
    try {
      const res = await fetch(`${API_ENDPOINTS.USERS}/${passwordUpdateUserId}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: newUserPassword })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      
      setSuccess(`Password updated for user "${passwordUpdateUsername}"!`);
      setShowPasswordModal(false);
      setPasswordUpdateUserId(null);
      setPasswordUpdateUsername('');
      setNewUserPassword('');
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    }
  };

  const openPasswordModal = (userId, username) => {
    setPasswordUpdateUserId(userId);
    setPasswordUpdateUsername(username);
    setNewUserPassword('');
    setShowPasswordModal(true);
    setError('');
    setSuccess('');
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordUpdateUserId(null);
    setPasswordUpdateUsername('');
    setNewUserPassword('');
  };

  if (userRole !== 'admin' && userRole !== 'superadmin') {
    return (
      <div className="container"><div className="alert alert-danger mt-4">Access denied. Admins only.</div></div>
    );
  }

  return (
    <div className="container">
      <div className="card p-4 mt-4 shadow-sm">
        <h2 className="mb-3">Admin</h2>
        <p className="text-muted">Manage users below.</p>
        {/* Create User Form */}
        <form className="row g-2 mb-4" onSubmit={handleAddUser} autoComplete="off">
          <div className="col-12 col-md-4 mb-2 mb-md-0">
            <input type="text" className="form-control" placeholder="Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} required />
          </div>
          <div className="col-12 col-md-4 mb-2 mb-md-0">
            <input type="password" className="form-control" placeholder="Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          </div>
          <div className="col-12 col-md-3 mb-2 mb-md-0">
            <select className="form-select" value={newRole} onChange={e => setNewRole(e.target.value)}>
              <option value="general">General</option>
              <option value="admin">Admin</option>
              {userRole === 'superadmin' && <option value="superadmin">SuperAdmin</option>}
            </select>
          </div>
          <div className="col-12 col-md-1 d-grid">
            <button type="submit" className="btn btn-success w-100">Add</button>
          </div>
        </form>
        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}
        <div className="table-responsive">
          <table className="table table-bordered table-striped align-middle text-nowrap fs-6">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{minWidth: '180px'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => {
                const activities = userActivities[user.id];
                const hasActivities = activities?.hasActivities || false;
                const isActive = user.active !== false; // Default to true if undefined
                
                return (
                  <tr key={user.id} className={!isActive ? 'table-secondary' : ''}>
                    <td>{user.id}</td>
                    <td>
                      {user.username}
                      {!isActive && <span className="badge bg-warning ms-2">Deactivated</span>}
                    </td>
                    <td>
                      <select
                        className="form-select form-select-sm"
                        value={user.role}
                        onChange={e => handleRoleChange(user.id, e.target.value)}
                        disabled={user.username === 'admin' || !isActive}
                      >
                        <option value="general">General</option>
                        <option value="admin">Admin</option>
                        {userRole === 'superadmin' && <option value="superadmin">SuperAdmin</option>}
                      </select>
                    </td>
                    <td>
                      <span className={`badge ${isActive ? 'bg-success' : 'bg-secondary'}`}>
                        {isActive ? 'Active' : 'Deactivated'}
                      </span>
                      {hasActivities && (
                        <span className="badge bg-info ms-1" title="User has activities">
                          Has Activities
                        </span>
                      )}
                    </td>
                    <td style={{minWidth: '180px'}}>
                      <div className="d-flex flex-wrap gap-1">
                        {isActive ? (
                          // User is active
                          <>
                            {/* Password Update Button - SuperAdmin Only */}
                            {userRole === 'superadmin' && user.username !== 'admin' && (
                              <button
                                className="btn btn-info btn-sm"
                                onClick={() => openPasswordModal(user.id, user.username)}
                                title="Update user password"
                                style={{minWidth: '80px'}}
                              >
                                <i className="fas fa-key me-1"></i>Password
                              </button>
                            )}
                            {hasActivities ? (
                              <button
                                className="btn btn-warning btn-sm"
                                onClick={() => handleDeactivate(user.id)}
                                disabled={user.username === 'admin'}
                                title="User has activities - can only deactivate"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDelete(user.id)}
                                disabled={user.username === 'admin'}
                                title="User has no activities - can delete"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        ) : (
                          // User is deactivated
                          <>
                            {/* Password Update Button - SuperAdmin Only (for deactivated users too) */}
                            {userRole === 'superadmin' && user.username !== 'admin' && (
                              <button
                                className="btn btn-info btn-sm"
                                onClick={() => openPasswordModal(user.id, user.username)}
                                title="Update user password"
                                style={{minWidth: '80px'}}
                              >
                                <i className="fas fa-key me-1"></i>Password
                              </button>
                            )}
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleReactivate(user.id)}
                              disabled={user.username === 'admin'}
                            >
                              Reactivate
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Password Update Modal - SuperAdmin Only */}
      {showPasswordModal && (
        <div className="modal show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Update Password for {passwordUpdateUsername}</h5>
                <button type="button" className="btn-close" onClick={closePasswordModal}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="newUserPassword" className="form-label">New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    id="newUserPassword"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Enter new password (minimum 6 characters)"
                    minLength="6"
                  />
                  <div className="form-text">
                    Password must be at least 6 characters long.
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closePasswordModal}>
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handlePasswordUpdate}
                  disabled={!newUserPassword || newUserPassword.length < 6}
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;

import React, { useState, useEffect } from 'react';
import { API_ENDPOINTS } from './config/api';

function Admin({ token, userRole }) {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // New user form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('general');

  useEffect(() => {
    if (userRole === 'admin' || userRole === 'superadmin') fetchUsers();
  }, [userRole]);

  const fetchUsers = async () => {
    setError('');
    try {
      const res = await fetch(API_ENDPOINTS.USERS, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError('Failed to fetch users.');
    }
  };

  const handleRoleChange = async (id, newRole) => {
    setError(''); setSuccess('');
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
    try {
      const res = await fetch(`${API_ENDPOINTS.USERS}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete user');
      setSuccess('User deleted!');
      fetchUsers();
    } catch (err) {
      setError('Failed to delete user.');
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
        headers: { 'Content-Type': 'application/json' },
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.username}</td>
                  <td>
                    <select
                      className="form-select form-select-sm"
                      value={user.role}
                      onChange={e => handleRoleChange(user.id, e.target.value)}
                      disabled={user.username === 'admin'}
                    >
                      <option value="general">General</option>
                      <option value="admin">Admin</option>
                      {userRole === 'superadmin' && <option value="superadmin">SuperAdmin</option>}
                    </select>
                  </td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(user.id)}
                      disabled={user.username === 'admin'}
                    >Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Admin;

import React, { useEffect, useState } from 'react';
import './App.css';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import StockManagement from './StockManagement';
import Sales from './Sales';
import Admin from './Admin';
import CarPartsManagement from './CarPartsManagement';
import AuditLog from './AuditLog';
import { API_ENDPOINTS } from './config/api';

function App() {
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authError, setAuthError] = useState('');

  // Car parts state
  const [parts, setParts] = useState([]);
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [stockStatus, setStockStatus] = useState('available');
  const [availableFrom, setAvailableFrom] = useState('');
  const [soldDate, setSoldDate] = useState('');
  const [parentId, setParentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // User role state
  const [userRole, setUserRole] = useState('');

  const navigate = useNavigate();

  // Fetch car parts from backend
  const fetchParts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(API_ENDPOINTS.PARTS, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` })
        }
      });
      const data = await res.json();
      setParts(data);
    } catch (err) {
      setError('Failed to fetch car parts');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) fetchParts();
  }, [token]);

  // Add a new car part (refactored for CarPartsManagement)
  const handleAddPart = async (partData) => {
    setError('');
    try {
      const res = await fetch(API_ENDPOINTS.PARTS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify(partData)
      });
      if (!res.ok) throw new Error('Failed to add part');
      fetchParts();
    } catch (err) {
      setError('Failed to add car part');
    }
  };

  // Handle login/register
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const endpoint = authMode === 'login' ? '/login' : '/register';
      const res = await fetch(`${API_ENDPOINTS.BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auth failed');
      if (authMode === 'login') {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setUserRole(data.role || '');
        navigate('/stock-management');
      } else {
        setAuthMode('login');
      }
      setUsername('');
      setPassword('');
    } catch (err) {
      setAuthError(err.message);
    }
  };

  useEffect(() => {
    if (token) {
      // Decode JWT to get role if not set
      if (!userRole) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUserRole(payload.role || '');
        } catch {}
      }
      fetchParts();
    } else {
      setUserRole('');
    }
  }, [token]);

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    setParts([]);
    navigate('/');
  };

  return (
    <div className="App">
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
        <div className="container-fluid">
          <Link className="navbar-brand" to="/">Rasuki Group Car Parts</Link>
          <button 
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#navbarNav" 
            aria-controls="navbarNav" 
            aria-expanded="false" 
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <Link className="nav-link" to="/stock-management"><b>Stock Reports</b></Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/parts-management"><b>Parts Management</b></Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link" to="/sales"><b>Sales</b></Link>
              </li>
              {(userRole === 'admin' || userRole === 'superadmin') && (
                <li className="nav-item">
                  <Link className="nav-link" to="/admin"><b>Admin</b></Link>
                </li>
              )}
              {(userRole === 'admin' || userRole === 'superadmin') && (
                <li className="nav-item">
                  <Link className="nav-link" to="/audit-log"><b>Audit Log</b></Link>
                </li>
              )}
            </ul>
            {token && (
              <div className="d-flex">
                <button
                  onClick={handleLogout}
                  className="btn btn-outline-light"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={
          <div className="container" style={{ maxWidth: 400 }}>
            <h1 className="text-center my-4">Car Parts</h1>
            <p className="text-center">Welcome to the Car Parts Management App! Please log in or register to continue.</p>
            {!token ? (
              <div className="card p-4 shadow-sm mb-4">
                <h2 className="mb-3 text-center">{authMode === 'login' ? 'Login' : 'Register'}</h2>
                <form onSubmit={handleAuth}>
                  <div className="mb-3">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Username"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-100">{authMode === 'login' ? 'Login' : 'Register'}</button>
                </form>
                <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="btn btn-link w-100 mt-2">
                  {authMode === 'login' ? '' : 'Already have an account? Login'}
                </button>
                {authError && <div className="alert alert-danger mt-2">{authError}</div>}
              </div>
            ) : (
              <button onClick={handleLogout} className="btn btn-secondary float-end">Logout</button>
            )}
          </div>
        } />
        <Route path="/stock-management" element={
          token ? (
            <StockManagement />
          ) : (
            <p style={{ color: 'red' }}>Please log in to access Stock Management.</p>
          )
        } />
        <Route path="/parts-management" element={
          token ? (
            <CarPartsManagement
              token={token}
              parts={parts}
              fetchParts={fetchParts}
              loading={loading}
              error={error}
              handleAddPart={handleAddPart}
              userRole={userRole}
            />
          ) : (
            <p style={{ color: 'red' }}>Please log in to access Parts Management.</p>
          )
        } />
        <Route path="/sales" element={<Sales />} />
        <Route path="/admin" element={<Admin token={token} userRole={userRole} />} />
        <Route path="/audit-log" element={
          (userRole === 'admin' || userRole === 'superadmin') ? (
            <AuditLog token={token} />
          ) : (
            <p style={{ color: 'red' }}>Admin access required to view audit logs.</p>
          )
        } />
      </Routes>
    </div>
  );
}

export default App;

// API configuration
// 
// Staging Environment URLs:
// - Frontend: https://rasuki-carparts-staging.up.railway.app/
// - Backend: https://carparts-backend-staging.up.railway.app
//
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
  BASE: API_BASE_URL,
  BASE_URL: API_BASE_URL,
  PARTS: `${API_BASE_URL}/parts`,
  PARTS_AVAILABLE: `${API_BASE_URL}/parts/available`,
  LOGIN: `${API_BASE_URL}/login`,
  REGISTER: `${API_BASE_URL}/register`,
  USERS: `${API_BASE_URL}/users`,
  BILLS: `${API_BASE_URL}/bills`,
  SALES: `${API_BASE_URL}/sales`,
  AUDIT_LOGS: `${API_BASE_URL}/audit-logs`,
  AUDIT_LOGS_FILTERS: `${API_BASE_URL}/audit-logs/filters`,
  RESERVATIONS: `${API_BASE_URL}/api/reservations`,
  STOCK_MOVEMENTS: `${API_BASE_URL}/stock-movements`
};

export default API_ENDPOINTS;

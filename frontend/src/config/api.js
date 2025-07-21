// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export const API_ENDPOINTS = {
  BASE_URL: API_BASE_URL,
  PARTS: `${API_BASE_URL}/parts`,
  LOGIN: `${API_BASE_URL}/login`,
  REGISTER: `${API_BASE_URL}/register`,
  USERS: `${API_BASE_URL}/users`,
  BILLS: `${API_BASE_URL}/bills`,
  AUDIT_LOGS: `${API_BASE_URL}/audit-logs`
};

export default API_ENDPOINTS;

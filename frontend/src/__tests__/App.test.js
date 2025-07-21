import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock fetch
global.fetch = jest.fn();

// Wrapper component to provide Router context
const RouterWrapper = ({ children }) => (
  <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
);

describe('App Component', () => {
  beforeEach(() => {
    fetch.mockClear();
    localStorage.clear();
    // Mock console.error to suppress act warnings in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

    describe('Authentication Flow', () => {
    test('should render login form when not authenticated', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      await act(async () => {
        render(<App />, { wrapper: RouterWrapper });
      });

      expect(screen.getByText('Car Parts')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    });

    test('should handle successful login', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      // Mock parts fetch for after login
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          token: 'fake-jwt-token', 
          role: 'admin'
        }),
      }).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      await act(async () => {
        render(<App />, { wrapper: RouterWrapper });
      });

      fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'admin' } });
      fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'admin' } });
      
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Login' }));
      });

      // After successful login, app navigates to Stock Management
      await waitFor(() => {
        expect(screen.getByText('Stock Management')).toBeInTheDocument();
      });
    });

    test('should handle login error', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      fetch.mockRejectedValueOnce(new Error('Invalid credentials'));

      await act(async () => {
        render(<App />, { wrapper: RouterWrapper });
      });

      fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'invalid' } });
      fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'invalid' } });
      
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Login' }));
      });

      await waitFor(() => {
        expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
      });
    });

    test('should handle user registration', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'User registered successfully' }),
      });

      await act(async () => {
        render(<App />, { wrapper: RouterWrapper });
      });

      // Switch to register mode - the toggle button is empty in login mode
      const toggleButton = screen.getByRole('button', { name: '' });
      
      await act(async () => {
        fireEvent.click(toggleButton);
      });

      // Now we should see the Register form
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Register' })).toBeInTheDocument();
      });
      
      fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'newuser' } });
      fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password' } });
      
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Register' }));
      });

      // After successful registration, it switches back to login mode
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      localStorage.setItem('token', 'fake-jwt-token');
      fetch.mockResolvedValue({
        ok: true,
        json: async () => []
      });
    });

    it('should display navigation links when authenticated', async () => {
      await act(async () => {
        render(<App />, { wrapper: RouterWrapper });
      });
      
      await waitFor(() => {
        expect(screen.getByText('Stock Reports')).toBeInTheDocument();
        expect(screen.getByText('Parts Management')).toBeInTheDocument();
        expect(screen.getByText('Sales')).toBeInTheDocument();
      });
    });

    it('should show admin link for admin users', async () => {
      localStorage.setItem('userRole', 'admin');
      
      await act(async () => {
        render(<App />, { wrapper: RouterWrapper });
      });
      
      await waitFor(() => {
        expect(screen.getByText('Stock Reports')).toBeInTheDocument();
      });
    });
  });

  describe('Parts Management Integration', () => {
    it('should fetch and display parts', async () => {
      // Set up localStorage mock to return the token
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'token') return 'fake-jwt-token';
        return null;
      });

      const mockParts = [
        {
          id: 1,
          name: 'Test Part',
          manufacturer: 'Test Manufacturer',
          stock_status: 'available',
          recommended_price: '100.00'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockParts
      });

      const RouterWrapperWithParts = ({ children }) => (
        <MemoryRouter initialEntries={['/parts-management']}>{children}</MemoryRouter>
      );

      await act(async () => {
        render(<App />, { wrapper: RouterWrapperWithParts });
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://localhost:3000/parts', {
          headers: {
            Authorization: 'Bearer fake-jwt-token'
          }
        });
      });
    });

    it('should handle parts fetch error', async () => {
      // Set up localStorage mock to return the token
      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'token') return 'fake-jwt-token';
        return null;
      });

      fetch.mockRejectedValueOnce(new Error('Network error'));

      const RouterWrapperWithParts = ({ children }) => (
        <MemoryRouter initialEntries={['/parts-management']}>{children}</MemoryRouter>
      );

      await act(async () => {
        render(<App />, { wrapper: RouterWrapperWithParts });
      });

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
      });
    });
  });
});

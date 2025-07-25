import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sales from '../Sales';

// Mock API endpoints
jest.mock('../config/api', () => ({
  API_ENDPOINTS: {
    BASE: 'https://carparts-management-production.up.railway.app',
    PARTS: 'https://carparts-management-production.up.railway.app/parts',
    BILLS: 'https://carparts-management-production.up.railway.app/bills',
    SALES: 'https://carparts-management-production.up.railway.app/sales'
  }
}));

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    clear: jest.fn(() => {
      store = {};
    })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Sales Component', () => {
  const mockProps = {
    token: 'fake-jwt-token',
    userRole: 'admin'
  };

  beforeEach(() => {
    fetch.mockClear();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => {
          if (key === 'token') return 'fake-jwt-token';
          return null;
        }),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });
    
    // Mock window.open for print functionality
    Object.defineProperty(window, 'open', {
      value: jest.fn(() => ({
        document: {
          write: jest.fn(),
          close: jest.fn(),
        },
        print: jest.fn(),
        close: jest.fn(),
      })),
      writable: true,
    });

    // Default mock responses
    fetch.mockImplementation((url) => {
      if (url.includes('/parts/available')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      if (url.includes('/bills')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      if (url.includes('/api/reservations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      });
    });
  });

  describe('Component Rendering', () => {
    it('should render sales management interface', async () => {
      render(<Sales {...mockProps} />);
      
      expect(screen.getByText('Sales Management')).toBeInTheDocument();
      expect(screen.getByText('New Sale')).toBeInTheDocument();
      expect(screen.getByText('Available Parts')).toBeInTheDocument();
      expect(screen.getByText('Sales History')).toBeInTheDocument();
      expect(screen.getByText('Reservation Management')).toBeInTheDocument();
    });

    it('should render sale form fields', () => {
      render(<Sales {...mockProps} />);
      
      expect(screen.getByLabelText('Customer Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Customer Phone')).toBeInTheDocument();
      expect(screen.getByLabelText('Bill Number (Optional)')).toBeInTheDocument();
      expect(screen.getByText('Complete Sale')).toBeInTheDocument();
    });
  });

  describe('Available Parts Management', () => {
    it('should fetch and display available parts', async () => {
      const mockParts = [
        {
          id: 1,
          name: 'Brake Pad',
          manufacturer: 'Brand A',
          available_stock: 10,
          recommended_price: 500.00,
          part_number: 'BP001',
          parent_id: null
        }
      ];

      fetch.mockImplementation((url) => {
        if (url.includes('/parts/available')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockParts)
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      });

      render(<Sales {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Brake Pad')).toBeInTheDocument();
        expect(screen.getByText('Brand A')).toBeInTheDocument();
        expect(screen.getByText('Stock: 10 | Rs 500')).toBeInTheDocument();
      });
    });

    it('should allow adding parts to cart', async () => {
      const mockParts = [
        {
          id: 1,
          name: 'Brake Pad',
          manufacturer: 'Brand A',
          available_stock: 10,
          recommended_price: 500.00
        }
      ];

      fetch.mockImplementation((url) => {
        if (url.includes('/parts/available')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockParts)
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      });

      render(<Sales {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Brake Pad')).toBeInTheDocument();
      });

      const addToCartButton = screen.getByText('Add to Cart');
      act(() => {
        fireEvent.click(addToCartButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Cart Items (1)')).toBeInTheDocument();
      });
    });
  });

  describe('Sales Processing', () => {
    it('should process sale successfully', async () => {
      const mockParts = [
        {
          id: 1,
          name: 'Brake Pad',
          manufacturer: 'Brand A',
          available_stock: 10,
          recommended_price: 500.00
        }
      ];

      fetch.mockImplementation((url, options) => {
        if (url.includes('/parts/available')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockParts)
          });
        }
        if (url.includes('/sales/sell') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 123 })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      });

      render(<Sales {...mockProps} />);

      // Wait for parts to load and add to cart
      await waitFor(() => {
        expect(screen.getByText('Brake Pad')).toBeInTheDocument();
      });

      const addToCartButton = screen.getByText('Add to Cart');
      act(() => {
        fireEvent.click(addToCartButton);
      });

      // Fill customer information
      const customerNameInput = screen.getByLabelText('Customer Name *');
      fireEvent.change(customerNameInput, { target: { value: 'John Doe' } });

      // Complete sale
      const completeSaleButton = screen.getByText('Complete Sale');
      act(() => {
        fireEvent.click(completeSaleButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Sale completed! Bill ID: 123')).toBeInTheDocument();
      });
    });
  });

  describe('Bills Management', () => {
    it('should fetch and display bills', async () => {
      const mockBills = [
        {
          id: 1,
          bill_number: 'B001',
          date: '2025-01-15',
          customer_name: 'John Doe',
          customer_phone: '+1234567890',
          total_quantity: 2,
          total_amount: 1500.00,
          status: 'active',
          items: [
            {
              part_name: 'Brake Pad',
              manufacturer: 'Brand A',
              quantity: 2,
              unit_price: 750.00,
              total_price: 1500.00
            }
          ]
        }
      ];

      fetch.mockImplementation((url) => {
        if (url.includes('/bills')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockBills)
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      });

      render(<Sales {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('B001')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('+1234567890')).toBeInTheDocument();
        expect(screen.getByText('Rs 1,500.00')).toBeInTheDocument();
      });
    });

    it('should allow printing bills', async () => {
      const mockBills = [
        {
          id: 1,
          bill_number: 'B001',
          date: '2025-01-15',
          customer_name: 'John Doe',
          customer_phone: '+1234567890',
          total_quantity: 2,
          total_amount: 1500.00,
          status: 'active',
          items: [
            {
              part_name: 'Brake Pad',
              manufacturer: 'Brand A',
              quantity: 2,
              unit_price: 750.00,
              total_price: 1500.00
            }
          ]
        }
      ];

      fetch.mockImplementation((url) => {
        if (url.includes('/bills')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockBills)
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      });

      render(<Sales {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('B001')).toBeInTheDocument();
      });

      const printButton = screen.getByText('Print');
      fireEvent.click(printButton);

      expect(window.open).toHaveBeenCalled();
    });
  });

  describe('Reservation Management', () => {
    it('should display reservation creation modal', async () => {
      const mockParts = [
        {
          id: 1,
          name: 'Brake Pad',
          manufacturer: 'Brand A',
          available_stock: 10,
          recommended_price: 500.00
        }
      ];

      fetch.mockImplementation((url) => {
        if (url.includes('/parts/available')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockParts)
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      });

      render(<Sales {...mockProps} />);

      const makeReservationButton = screen.getByText('Make Reservation');
      fireEvent.click(makeReservationButton);

      await waitFor(() => {
        expect(screen.getByText('Create Reservation')).toBeInTheDocument();
        expect(screen.getByLabelText('Customer Name *')).toBeInTheDocument();
        expect(screen.getByLabelText('Customer Phone *')).toBeInTheDocument();
        expect(screen.getByLabelText('Select Part *')).toBeInTheDocument();
      });
    });

    it('should show hide/show reservations toggle', () => {
      render(<Sales {...mockProps} />);
      
      const showReservationsButton = screen.getByText('Show Reservations');
      fireEvent.click(showReservationsButton);
      
      expect(screen.getByText('Hide Reservations')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter parts by search term', async () => {
      const mockParts = [
        {
          id: 1,
          name: 'Brake Pad',
          manufacturer: 'Brand A',
          available_stock: 10,
          recommended_price: 500.00
        },
        {
          id: 2,
          name: 'Oil Filter',
          manufacturer: 'Brand B',
          available_stock: 5,
          recommended_price: 300.00
        }
      ];

      fetch.mockImplementation((url) => {
        if (url.includes('/parts/available')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockParts)
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      });

      render(<Sales {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('Brake Pad')).toBeInTheDocument();
        expect(screen.getByText('Oil Filter')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/Search by name, manufacturer/);
      fireEvent.change(searchInput, { target: { value: 'Brake' } });

      await waitFor(() => {
        expect(screen.getByText('Brake Pad')).toBeInTheDocument();
        expect(screen.queryByText('Oil Filter')).not.toBeInTheDocument();
      });
    });

    it('should toggle parent ID only search', async () => {
      render(<Sales {...mockProps} />);

      const parentIdCheckbox = screen.getByLabelText('Search by parent ID only');
      fireEvent.click(parentIdCheckbox);

      expect(parentIdCheckbox).toBeChecked();
    });
  });
});

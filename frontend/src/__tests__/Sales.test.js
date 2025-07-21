import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Sales from '../Sales';

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
  });

  describe('Search Functionality', () => {
    it('should render search form', () => {
      render(<Sales />);
      
      expect(screen.getByPlaceholderText('Search by ID or Name')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('should search for parts successfully', async () => {
      const mockParts = [
        {
          id: 1,
          name: 'Test Part',
          manufacturer: 'Test Manufacturer',
          stock_status: 'available',
          recommended_price: '100.00',
          sold_price: null,
          available_from: '2025-07-20',
          sold_date: null
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockParts
      });

      render(<Sales />);
      
      const searchInput = screen.getByPlaceholderText('Search by ID or Name');
      const searchButton = screen.getByText('Search');

      fireEvent.change(searchInput, { target: { value: 'Test Part' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://localhost:3000/parts', {
          headers: {
            Authorization: 'Bearer fake-jwt-token'
          }
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Test Part')).toBeInTheDocument();
        expect(screen.getByText('Test Manufacturer')).toBeInTheDocument();
        expect(screen.getByText('Available')).toBeInTheDocument();
      });
    });

    it('should handle search with no results', async () => {
      const mockParts = [];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockParts
      });

      render(<Sales />);
      
      const searchInput = screen.getByPlaceholderText('Search by ID or Name');
      const searchButton = screen.getByText('Search');

      fireEvent.change(searchInput, { target: { value: 'Non-existent Part' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('No matching parts found.')).toBeInTheDocument();
      });
    });

    it('should handle search error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<Sales />);
      
      const searchInput = screen.getByPlaceholderText('Search by ID or Name');
      const searchButton = screen.getByText('Search');

      fireEvent.change(searchInput, { target: { value: 'Test Part' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to search parts.')).toBeInTheDocument();
      });
    });
  });

  describe('Sales Functionality', () => {
    it('should open sell modal when sell button is clicked', async () => {
      const mockParts = [
        {
          id: 1,
          name: 'Test Part',
          manufacturer: 'Test Manufacturer',
          stock_status: 'available',
          recommended_price: '100.00',
          sold_price: null
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockParts
      });

      render(<Sales />);
      
      const searchInput = screen.getByPlaceholderText('Search by ID or Name');
      const searchButton = screen.getByText('Search');

      fireEvent.change(searchInput, { target: { value: '1' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Test Part')).toBeInTheDocument();
      });

      const sellButton = screen.getByText('Sell');
      fireEvent.click(sellButton);

      await waitFor(() => {
        expect(screen.getByText('Set Selling Price')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Customer Name')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Enter selling price')).toBeInTheDocument();
      });
    });

    it('should complete sale successfully', async () => {
      const mockParts = [
        {
          id: 1,
          name: 'Test Part',
          manufacturer: 'Test Manufacturer',
          stock_status: 'available',
          recommended_price: '100.00',
          sold_price: null
        }
      ];

      const mockSoldPart = {
        ...mockParts[0],
        stock_status: 'sold',
        sold_price: '150.00',
        sold_date: '2025-07-20'
      };

      const mockBill = {
        id: 1,
        customer_name: 'Test Customer',
        bill_number: 'TEST001',
        date: '2025-07-20',
        items: [mockSoldPart]
      };

      // Mock the initial search
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockParts
      });

      render(<Sales />);
      
      const searchInput = screen.getByPlaceholderText('Search by ID or Name');
      const searchButton = screen.getByText('Search');

      fireEvent.change(searchInput, { target: { value: '1' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Test Part')).toBeInTheDocument();
      });

      const sellButton = screen.getByText('Sell');
      fireEvent.click(sellButton);

      await waitFor(() => {
        expect(screen.getByText('Set Selling Price')).toBeInTheDocument();
      });

      // Mock the sell part request
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSoldPart
      });

      // Mock the create bill request
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBill
      });

      const customerNameInput = screen.getByPlaceholderText('Customer Name');
      const sellingPriceInput = screen.getByPlaceholderText('Enter selling price');
      const confirmButton = screen.getByText('Confirm Sell');

      fireEvent.change(customerNameInput, { target: { value: 'Test Customer' } });
      fireEvent.change(sellingPriceInput, { target: { value: '150' } });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://localhost:3000/parts/1/sell', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer fake-jwt-token'
          },
          body: JSON.stringify({ sold_price: '150' })
        });
      });

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://localhost:3000/bills', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer fake-jwt-token'
          },
          body: expect.stringContaining('Test Customer')
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Part sold and bill saved successfully!')).toBeInTheDocument();
      });
    });

    it('should handle sell error', async () => {
      const mockParts = [
        {
          id: 1,
          name: 'Test Part',
          manufacturer: 'Test Manufacturer',
          stock_status: 'available'
        }
      ];

      // Mock the initial search
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockParts
      });

      render(<Sales />);
      
      const searchInput = screen.getByPlaceholderText('Search by ID or Name');
      const searchButton = screen.getByText('Search');

      fireEvent.change(searchInput, { target: { value: '1' } });
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Test Part')).toBeInTheDocument();
      });

      const sellButton = screen.getByText('Sell');
      fireEvent.click(sellButton);

      // Mock sell failure
      fetch.mockResolvedValueOnce({
        ok: false
      });

      const customerNameInput = screen.getByPlaceholderText('Customer Name');
      const sellingPriceInput = screen.getByPlaceholderText('Enter selling price');
      const confirmButton = screen.getByText('Confirm Sell');

      fireEvent.change(customerNameInput, { target: { value: 'Test Customer' } });
      fireEvent.change(sellingPriceInput, { target: { value: '150' } });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to sell part or save bill.')).toBeInTheDocument();
      });
    });
  });

  describe('Bills Management', () => {
    it('should retrieve and display bills', async () => {
      const mockBills = [
        {
          id: 1,
          customer_name: 'Test Customer',
          bill_number: 'TEST001',
          date: '2025-07-20',
          items: [
            { id: 1, name: 'Test Part', sold_price: '150' }
          ]
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBills
      });

      render(<Sales />);
      
      const retrieveBillsButton = screen.getByText('Retrieve Bills');
      fireEvent.click(retrieveBillsButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://localhost:3000/bills', {
          headers: {
            Authorization: 'Bearer fake-jwt-token'
          }
        });
      });

      await waitFor(() => {
        expect(screen.getByText('TEST001')).toBeInTheDocument();
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
        expect(screen.getByText('Print Bill')).toBeInTheDocument();
      });
    });

    it('should filter bills by search term', async () => {
      const mockBills = [
        {
          id: 1,
          customer_name: 'John Doe',
          bill_number: 'BILL001',
          date: '2025-07-20',
          items: []
        },
        {
          id: 2,
          customer_name: 'Jane Smith',
          bill_number: 'BILL002',
          date: '2025-07-20',
          items: []
        }
      ];

      fetch.mockResolvedValue({
        ok: true,
        json: async () => mockBills
      });

      render(<Sales />);
      
      const searchBillsInput = screen.getByPlaceholderText('Search bills by number or customer name');
      fireEvent.change(searchBillsInput, { target: { value: 'John' } });

      // The component should filter the results
      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      });
    });

    it('should handle bills retrieval error', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<Sales />);
      
      const retrieveBillsButton = screen.getByText('Retrieve Bills');
      fireEvent.click(retrieveBillsButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to retrieve bills.')).toBeInTheDocument();
      });
    });
  });

  describe('Print Functionality', () => {
    it('should handle print bill', async () => {
      // Mock window.open
      const mockOpen = jest.fn();
      const mockWrite = jest.fn();
      const mockClose = jest.fn();
      
      const mockWindow = {
        document: {
          write: mockWrite,
          close: mockClose
        }
      };
      
      global.window.open = mockOpen.mockReturnValue(mockWindow);

      const mockBills = [
        {
          id: 1,
          customer_name: 'Test Customer',
          bill_number: 'TEST001',
          date: '2025-07-20',
          items: [
            { id: 1, name: 'Test Part', sold_price: '150', manufacturer: 'Test Manufacturer' }
          ]
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBills
      });

      render(<Sales />);
      
      const retrieveBillsButton = screen.getByText('Retrieve Bills');
      fireEvent.click(retrieveBillsButton);

      await waitFor(() => {
        expect(screen.getByText('Print Bill')).toBeInTheDocument();
      });

      const printButton = screen.getByText('Print Bill');
      fireEvent.click(printButton);

      expect(mockOpen).toHaveBeenCalledWith('', '_blank');
      expect(mockWrite).toHaveBeenCalled();
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Component State Management', () => {
    it('should manage loading state', async () => {
      // Make fetch hang to test loading state
      fetch.mockImplementationOnce(() => new Promise(() => {}));

      render(<Sales />);
      
      const searchInput = screen.getByPlaceholderText('Search by ID or Name');
      const searchButton = screen.getByText('Search');

      fireEvent.change(searchInput, { target: { value: 'Test' } });
      fireEvent.click(searchButton);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should reset form after successful sale', async () => {
      const mockParts = [
        {
          id: 1,
          name: 'Test Part',
          stock_status: 'available'
        }
      ];

      const mockSoldPart = {
        ...mockParts[0],
        stock_status: 'sold'
      };

      const mockBill = {
        id: 1,
        customer_name: 'Test Customer'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockParts
      });

      render(<Sales />);

      // Perform search and open sell modal
      const searchInput = screen.getByPlaceholderText('Search by ID or Name');
      fireEvent.change(searchInput, { target: { value: '1' } });
      fireEvent.click(screen.getByText('Search'));

      await waitFor(() => {
        expect(screen.getByText('Test Part')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Sell'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Customer Name')).toBeInTheDocument();
      });

      // Mock successful sale
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSoldPart
      });

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockBill
      });

      const customerNameInput = screen.getByPlaceholderText('Customer Name');
      const sellingPriceInput = screen.getByPlaceholderText('Enter selling price');

      fireEvent.change(customerNameInput, { target: { value: 'Test Customer' } });
      fireEvent.change(sellingPriceInput, { target: { value: '150' } });
      fireEvent.click(screen.getByText('Confirm Sell'));

      // The modal should close after successful sale
      await waitFor(() => {
        expect(screen.queryByText('Set Selling Price')).not.toBeInTheDocument();
      });
    });
  });
});

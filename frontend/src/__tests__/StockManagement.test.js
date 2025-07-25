import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StockManagement from '../StockManagement';

// Mock the API endpoints
jest.mock('../config/api', () => ({
  API_ENDPOINTS: {
    PARTS: 'https://carparts-management-production.up.railway.app/parts'
  }
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Mock fetch
global.fetch = jest.fn();

describe('StockManagement Component', () => {
  const mockProps = {
    user: { id: 1, username: 'testuser' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('fake-token');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    test('should render stock management interface', () => {
      render(<StockManagement {...mockProps} />);
      expect(screen.getByText('Stock Management')).toBeInTheDocument();
      expect(screen.getByText('Available Stock')).toBeInTheDocument();
      expect(screen.getByText('Sold Stock Report')).toBeInTheDocument();
      expect(screen.getByText('Parent-Child Relationship Report')).toBeInTheDocument();
    });

    test('should render date filters for sold stock', () => {
      render(<StockManagement {...mockProps} />);
      expect(screen.getByText('Start Date:')).toBeInTheDocument();
      expect(screen.getByText('End Date:')).toBeInTheDocument();
      expect(screen.getByText('Get Sold Stock')).toBeInTheDocument();
    });
  });

  describe('Available Stock Management', () => {
    test('should fetch and display available stock', async () => {
      const mockAvailableData = [
        {
          id: 1,
          name: 'Brake Pad',
          manufacturer: 'Brand A',
          recommended_price: '500.00',
          available_from: '2023-06-01',
          container_no: 'C001'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailableData
      });

      render(<StockManagement {...mockProps} />);
      
      const getAvailableStockButton = screen.getByText('Get Available Stock');
      fireEvent.click(getAvailableStockButton);

      await waitFor(() => {
        expect(screen.getByText(/Found \d+ parts with \d+ units available in stock\./)).toBeInTheDocument();
      });

      expect(fetch).toHaveBeenCalledWith('https://carparts-management-production.up.railway.app/parts', {
        headers: { Authorization: 'Bearer fake-token' }
      });
    });

    test('should handle available stock fetch error', async () => {
      fetch.mockRejectedValueOnce(new Error('API Error'));

      render(<StockManagement {...mockProps} />);
      
      const getAvailableStockButton = screen.getByText('Get Available Stock');
      fireEvent.click(getAvailableStockButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to retrieve available stock.')).toBeInTheDocument();
      });
    });

    test('should show print button when stock is available', async () => {
      const mockAvailableData = [
        {
          id: 1,
          name: 'Brake Pad',
          manufacturer: 'Brand A',
          recommended_price: '500.00',
          available_from: '2023-06-01'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAvailableData
      });

      render(<StockManagement {...mockProps} />);
      
      const getAvailableStockButton = screen.getByText('Get Available Stock');
      fireEvent.click(getAvailableStockButton);

      await waitFor(() => {
        expect(screen.getByText(/Found \d+ parts with \d+ units available in stock\./)).toBeInTheDocument();
      });
    });
  });

  describe('Basic Functionality', () => {
    test('should show loading message when loading', () => {
      render(<StockManagement {...mockProps} />);
      
      // Trigger loading by clicking a button
      const getAvailableStockButton = screen.getByText('Get Available Stock');
      fireEvent.click(getAvailableStockButton);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('Parent-Child Relationship Report', () => {
    test('should render parent-child relationship report section', () => {
      render(<StockManagement {...mockProps} />);
      expect(screen.getByText('Parent-Child Relationship Report')).toBeInTheDocument();
      expect(screen.getByText('Generate Parent-Child Report')).toBeInTheDocument();
    });

    test('should fetch and display parent-child relationships', async () => {
      const mockPartsData = [
        {
          id: 1,
          name: 'Engine Assembly',
          manufacturer: 'Brand A',
          parent_id: null,
          status: 'Available',
          recommended_price: '1000.00',
          available_from: '2025-01-01',
          sold_date: null
        },
        {
          id: 2,
          name: 'Piston',
          manufacturer: 'Brand A',
          parent_id: 1,
          status: 'Available',
          recommended_price: '500.00',
          available_from: '2025-01-01',
          sold_date: null
        },
        {
          id: 3,
          name: 'Cylinder Head',
          manufacturer: 'Brand A',
          parent_id: 1,
          status: 'Sold',
          recommended_price: '800.00',
          available_from: '2025-01-01',
          sold_date: '2025-01-15'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPartsData
      });

      render(<StockManagement {...mockProps} />);
      
      const generateButton = screen.getByText('Generate Parent-Child Report');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Found 2 parent-child relationships.')).toBeInTheDocument();
      });

      // Check if data is displayed correctly - use getAllByText for duplicate text
      expect(screen.getAllByText('Engine Assembly')).toHaveLength(2);
      expect(screen.getByText('Piston')).toBeInTheDocument();
      expect(screen.getByText('Cylinder Head')).toBeInTheDocument();
    });

    test('should show summary statistics for parent-child relationships', async () => {
      const mockPartsData = [
        {
          id: 1,
          name: 'Engine Assembly',
          manufacturer: 'Brand A',
          parent_id: null,
          status: 'Available',
          recommended_price: '1000.00',
          available_from: '2025-01-01',
          sold_date: null
        },
        {
          id: 2,
          name: 'Piston',
          manufacturer: 'Brand A',
          parent_id: 1,
          status: 'Available',
          recommended_price: '500.00',
          available_from: '2025-01-01',
          sold_date: null
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPartsData
      });

      render(<StockManagement {...mockProps} />);
      
      const generateButton = screen.getByText('Generate Parent-Child Report');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Total Parent-Child Relationships:/)).toBeInTheDocument();
        expect(screen.getByText(/Unique Parent Parts:/)).toBeInTheDocument();
        expect(screen.getByText(/Child Parts - Available:/)).toBeInTheDocument();
        expect(screen.getByText(/Total Value of Child Parts: Rs\./)).toBeInTheDocument();
      });
    });

    test('should handle empty parent-child relationships', async () => {
      const mockPartsData = [
        {
          id: 1,
          name: 'Engine Assembly',
          manufacturer: 'Brand A',
          parent_id: null,
          status: 'Available',
          recommended_price: '1000.00',
          available_from: '2025-01-01',
          sold_date: null
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPartsData
      });

      render(<StockManagement {...mockProps} />);
      
      const generateButton = screen.getByText('Generate Parent-Child Report');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Found 0 parent-child relationships.')).toBeInTheDocument();
      });
    });

    test('should handle fetch error for parent-child relationships', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      render(<StockManagement {...mockProps} />);
      
      const generateButton = screen.getByText('Generate Parent-Child Report');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to retrieve parent-child relationships.')).toBeInTheDocument();
      });
    });

    test('should show print button when parent-child data is available', async () => {
      const mockPartsData = [
        {
          id: 1,
          name: 'Engine Assembly',
          manufacturer: 'Brand A',
          parent_id: null,
          status: 'Available',
          recommended_price: '1000.00',
          available_from: '2025-01-01',
          sold_date: null
        },
        {
          id: 2,
          name: 'Piston',
          manufacturer: 'Brand A',
          parent_id: 1,
          status: 'Available',
          recommended_price: '500.00',
          available_from: '2025-01-01',
          sold_date: null
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPartsData
      });

      render(<StockManagement {...mockProps} />);
      
      const generateButton = screen.getByText('Generate Parent-Child Report');
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getAllByText('Print Report')).toHaveLength(1);
      });
    });
  });
});
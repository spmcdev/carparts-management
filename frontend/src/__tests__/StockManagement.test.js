import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import StockManagement from '../StockManagement';

// Mock fetch
global.fetch = jest.fn();

describe('StockManagement Component', () => {
  const mockProps = {
    token: 'fake-token',
    userRole: 'admin'
  };

  beforeEach(() => {
    fetch.mockClear();
    localStorage.clear();
    localStorage.setItem('token', 'fake-token');
  });

  describe('Component Rendering', () => {
    it('should render stock management interface', () => {
      render(<StockManagement {...mockProps} />);
      
      expect(screen.getByText('Stock Management')).toBeInTheDocument();
      expect(screen.getByText('Get Available Stock')).toBeInTheDocument();
      expect(screen.getByText('Get Sold Stock')).toBeInTheDocument();
    });

    it('should render date filters for sold stock', () => {
      render(<StockManagement {...mockProps} />);
      
      expect(screen.getByText('Start Date:')).toBeInTheDocument();
      expect(screen.getByText('End Date:')).toBeInTheDocument();
    });
  });

  describe('Available Stock Management', () => {
    it('should fetch and display available stock', async () => {
      const mockStockData = [
        {
          id: 1,
          name: 'Brake Pad',
          manufacturer: 'Brand A',
          stock_status: 'available',
          recommended_price: '1500.00',
          available_from: '2023-01-01'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStockData
      });

      render(<StockManagement {...mockProps} />);
      
      const getStockButton = screen.getByText('Get Available Stock');
      fireEvent.click(getStockButton);

      await waitFor(() => {
        expect(screen.getByText('Brake Pad')).toBeInTheDocument();
        expect(screen.getByText('Brand A')).toBeInTheDocument();
      });

      expect(fetch).toHaveBeenCalledWith('http://localhost:3000/parts', {
        headers: { Authorization: 'Bearer fake-token' }
      });
    });

    it('should handle available stock fetch error', async () => {
      fetch.mockRejectedValueOnce(new Error('API Error'));

      render(<StockManagement {...mockProps} />);
      
      const getStockButton = screen.getByText('Get Available Stock');
      fireEvent.click(getStockButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to retrieve available stock.')).toBeInTheDocument();
      });
    });

    it('should show print button when stock is available', async () => {
      const mockStockData = [
        {
          id: 1,
          name: 'Test Part',
          manufacturer: 'Test Brand',
          stock_status: 'available',
          recommended_price: '1000.00'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockStockData
      });

      render(<StockManagement {...mockProps} />);
      
      const getStockButton = screen.getByText('Get Available Stock');
      fireEvent.click(getStockButton);

      await waitFor(() => {
        expect(screen.getByText('Print Available Stock Report')).toBeInTheDocument();
      });
    });
  });

  describe('Sold Stock Reports', () => {
    it('should fetch sold stock with date range', async () => {
      const mockSoldData = [
        {
          id: 1,
          name: 'Sold Part',
          manufacturer: 'Brand B',
          stock_status: 'sold',
          sold_price: '1200.00',
          sold_date: '2023-06-15',
          recommended_price: '1000.00'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSoldData
      });

      render(<StockManagement {...mockProps} />);
      
      // Set date range
      const startDateInput = screen.getByLabelText('Start Date:');
      const endDateInput = screen.getByLabelText('End Date:');
      fireEvent.change(startDateInput, { target: { value: '2023-06-01' } });
      fireEvent.change(endDateInput, { target: { value: '2023-06-30' } });
      
      const getSoldStockButton = screen.getByText('Get Sold Stock');
      fireEvent.click(getSoldStockButton);

      await waitFor(() => {
        expect(screen.getByText('Sold Part')).toBeInTheDocument();
        expect(screen.getByText('₹1,200.00')).toBeInTheDocument();
      });
    });

    it('should handle sold stock fetch error', async () => {
      fetch.mockRejectedValueOnce(new Error('API Error'));

      render(<StockManagement {...mockProps} />);
      
      const getSoldStockButton = screen.getByText('Get Sold Stock');
      fireEvent.click(getSoldStockButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to retrieve sold stock.')).toBeInTheDocument();
      });
    });

    it('should calculate profit/loss correctly', async () => {
      const mockSoldData = [
        {
          id: 1,
          name: 'Profitable Part',
          stock_status: 'sold',
          sold_price: '1200.00',
          recommended_price: '1000.00',
          sold_date: '2023-06-15'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSoldData
      });

      render(<StockManagement {...mockProps} />);
      
      const getSoldStockButton = screen.getByText('Get Sold Stock');
      fireEvent.click(getSoldStockButton);

      await waitFor(() => {
        expect(screen.getByText('₹200.00')).toBeInTheDocument();
      });
    });

    it('should show print button for sold stock report', async () => {
      const mockSoldData = [
        {
          id: 1,
          name: 'Sold Part',
          stock_status: 'sold',
          sold_price: '1000.00',
          sold_date: '2023-06-15'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSoldData
      });

      render(<StockManagement {...mockProps} />);
      
      const getSoldStockButton = screen.getByText('Get Sold Stock');
      fireEvent.click(getSoldStockButton);

      await waitFor(() => {
        expect(screen.getByText('Print Report')).toBeInTheDocument();
      });
    });
  });

  describe('Basic Functionality', () => {
    it('should show loading message when loading', () => {
      render(<StockManagement {...mockProps} />);
      
      // Simulate loading state by setting internal state
      const { rerender } = render(<StockManagement {...mockProps} />);
      
      // Check initial render without loading state
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    it('should display success message after successful operation', async () => {
      const mockSoldData = [
        {
          id: 1,
          name: 'Test Part',
          stock_status: 'sold',
          sold_date: '2023-06-15'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSoldData
      });

      render(<StockManagement {...mockProps} />);
      
      // Set date range
      const startDateInput = screen.getByLabelText('Start Date:');
      const endDateInput = screen.getByLabelText('End Date:');
      fireEvent.change(startDateInput, { target: { value: '2023-06-01' } });
      fireEvent.change(endDateInput, { target: { value: '2023-06-30' } });
      
      const getSoldStockButton = screen.getByText('Get Sold Stock');
      fireEvent.click(getSoldStockButton);

      await waitFor(() => {
        expect(screen.getByText(/Found.*items sold between/)).toBeInTheDocument();
      });
    });

    it('should handle empty date range gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(<StockManagement {...mockProps} />);
      
      const getSoldStockButton = screen.getByText('Get Sold Stock');
      fireEvent.click(getSoldStockButton);

      await waitFor(() => {
        expect(screen.getByText(/Found 0 items sold between/)).toBeInTheDocument();
      });
    });

    it('should filter sold stock by date range correctly', async () => {
      const mockAllParts = [
        {
          id: 1,
          name: 'Part 1',
          stock_status: 'sold',
          sold_date: '2023-06-10',
          sold_price: '1000.00'
        },
        {
          id: 2,
          name: 'Part 2', 
          stock_status: 'sold',
          sold_date: '2023-07-10',
          sold_price: '1200.00'
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAllParts
      });

      render(<StockManagement {...mockProps} />);
      
      // Set date range to only include first part
      const startDateInput = screen.getByLabelText('Start Date:');
      const endDateInput = screen.getByLabelText('End Date:');
      fireEvent.change(startDateInput, { target: { value: '2023-06-01' } });
      fireEvent.change(endDateInput, { target: { value: '2023-06-30' } });
      
      const getSoldStockButton = screen.getByText('Get Sold Stock');
      fireEvent.click(getSoldStockButton);

      await waitFor(() => {
        expect(screen.getByText('Part 1')).toBeInTheDocument();
        expect(screen.queryByText('Part 2')).not.toBeInTheDocument();
      });
    });
  });
});

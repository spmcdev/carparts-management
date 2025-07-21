import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CarPartsManagement from '../CarPartsManagement';

// Mock fetch
global.fetch = jest.fn();

describe('CarPartsManagement Component', () => {
  const mockProps = {
    token: 'fake-token',
    parts: [],
    fetchParts: jest.fn(),
    loading: false,
    error: '',
    handleAddPart: jest.fn(),
    userRole: 'admin'
  };

  beforeEach(() => {
    fetch.mockClear();
    mockProps.fetchParts.mockClear();
    mockProps.handleAddPart.mockClear();
  });

  describe('Component Rendering', () => {
    it('should render form fields correctly', () => {
      render(<CarPartsManagement {...mockProps} />);
      
      expect(screen.getByPlaceholderText('Part Name')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Manufacturer')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Parent Part ID (optional)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Recommended Price')).toBeInTheDocument();
      expect(screen.getByText('Add Part')).toBeInTheDocument();
    });

    it('should show cost price field for superadmin', () => {
      const superAdminProps = { ...mockProps, userRole: 'superadmin' };
      render(<CarPartsManagement {...superAdminProps} />);
      
      expect(screen.getByPlaceholderText('Cost Price (SuperAdmin only)')).toBeInTheDocument();
    });

    it('should not show cost price field for admin', () => {
      render(<CarPartsManagement {...mockProps} />);
      
      expect(screen.queryByPlaceholderText('Cost Price (SuperAdmin only)')).not.toBeInTheDocument();
    });

    it('should not show cost price field for general user', () => {
      const generalProps = { ...mockProps, userRole: 'general' };
      render(<CarPartsManagement {...generalProps} />);
      
      expect(screen.queryByPlaceholderText('Cost Price (SuperAdmin only)')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should handle form submission with basic fields', () => {
      render(<CarPartsManagement {...mockProps} />);
      
      const nameInput = screen.getByPlaceholderText('Part Name');
      const manufacturerInput = screen.getByPlaceholderText('Manufacturer');
      const submitButton = screen.getByText('Add Part');

      fireEvent.change(nameInput, { target: { value: 'Test Part' } });
      fireEvent.change(manufacturerInput, { target: { value: 'Test Manufacturer' } });
      fireEvent.click(submitButton);

      expect(mockProps.handleAddPart).toHaveBeenCalledWith({
        name: 'Test Part',
        manufacturer: 'Test Manufacturer',
        stock_status: 'available',
        available_from: '',
        sold_date: '',
        parent_id: '',
        recommended_price: '',
        local_purchase: false
      });
    });

    it('should include cost price for superadmin', () => {
      const superAdminProps = { ...mockProps, userRole: 'superadmin' };
      render(<CarPartsManagement {...superAdminProps} />);
      
      const nameInput = screen.getByPlaceholderText('Part Name');
      const manufacturerInput = screen.getByPlaceholderText('Manufacturer');
      const costPriceInput = screen.getByPlaceholderText('Cost Price (SuperAdmin only)');
      const submitButton = screen.getByText('Add Part');

      fireEvent.change(nameInput, { target: { value: 'Admin Part' } });
      fireEvent.change(manufacturerInput, { target: { value: 'Admin Manufacturer' } });
      fireEvent.change(costPriceInput, { target: { value: '100.50' } });
      fireEvent.click(submitButton);

      expect(mockProps.handleAddPart).toHaveBeenCalledWith({
        name: 'Admin Part',
        manufacturer: 'Admin Manufacturer',
        stock_status: 'available',
        available_from: '',
        sold_date: '',
        parent_id: '',
        recommended_price: '',
        local_purchase: false,
        cost_price: '100.50'
      });
    });

    it('should clear form after submission', () => {
      render(<CarPartsManagement {...mockProps} />);
      
      const nameInput = screen.getByPlaceholderText('Part Name');
      const manufacturerInput = screen.getByPlaceholderText('Manufacturer');
      const submitButton = screen.getByText('Add Part');

      fireEvent.change(nameInput, { target: { value: 'Test Part' } });
      fireEvent.change(manufacturerInput, { target: { value: 'Test Manufacturer' } });
      fireEvent.click(submitButton);

      expect(nameInput.value).toBe('');
      expect(manufacturerInput.value).toBe('');
    });
  });

  describe('Parts Display', () => {
    it('should display parts list', () => {
      const partsData = [
        {
          id: 1,
          name: 'Brake Pad',
          manufacturer: 'Brand A',
          stock_status: 'available',
          recommended_price: '1500.00'
        },
        {
          id: 2,
          name: 'Oil Filter',
          manufacturer: 'Brand B',
          stock_status: 'sold',
          sold_price: '800.00'
        }
      ];

      const propsWithParts = { ...mockProps, parts: partsData };
      render(<CarPartsManagement {...propsWithParts} />);

      expect(screen.getByText('Brake Pad')).toBeInTheDocument();
      expect(screen.getByText('Oil Filter')).toBeInTheDocument();
      expect(screen.getByText('Brand A')).toBeInTheDocument();
      expect(screen.getByText('Brand B')).toBeInTheDocument();
    });

    it('should show loading state', () => {
      const loadingProps = { ...mockProps, loading: true };
      render(<CarPartsManagement {...loadingProps} />);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should show error message', () => {
      const errorProps = { ...mockProps, error: 'Failed to fetch parts' };
      render(<CarPartsManagement {...errorProps} />);
      
      expect(screen.getByText('Failed to fetch parts')).toBeInTheDocument();
    });
  });

  describe('Edit Functionality', () => {
    const partsData = [
      {
        id: 1,
        name: 'Brake Pad',
        manufacturer: 'Brand A',
        stock_status: 'available',
        recommended_price: '1500.00',
        cost_price: '1200.00'
      }
    ];

    it('should enable edit mode when edit button is clicked', () => {
      const propsWithParts = { ...mockProps, parts: partsData };
      render(<CarPartsManagement {...propsWithParts} />);

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      // Check that edit mode is enabled (save/cancel buttons should appear)
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should cancel edit mode', () => {
      const propsWithParts = { ...mockProps, parts: partsData };
      render(<CarPartsManagement {...propsWithParts} />);

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      // Edit mode should be disabled
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('should save edited part', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Part updated successfully' })
      });

      const propsWithParts = { ...mockProps, parts: partsData };
      render(<CarPartsManagement {...propsWithParts} />);

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      // Edit the part name
      const nameInput = screen.getByDisplayValue('Brake Pad');
      fireEvent.change(nameInput, { target: { value: 'Updated Brake Pad' } });

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://localhost:3000/parts/1', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer fake-token'
          },
          body: expect.stringContaining('Updated Brake Pad')
        });
      });

      expect(mockProps.fetchParts).toHaveBeenCalled();
    });

    it('should handle edit error', async () => {
      fetch.mockRejectedValueOnce(new Error('Update failed'));

      const propsWithParts = { ...mockProps, parts: partsData };
      render(<CarPartsManagement {...propsWithParts} />);

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      const saveButton = screen.getByText('Save');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to update part.')).toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Field Display', () => {
    const partsData = [
      {
        id: 1,
        name: 'Test Part',
        manufacturer: 'Test Brand',
        stock_status: 'available',
        recommended_price: '1500.00',
        cost_price: '1200.00',
        sold_price: '1300.00'
      }
    ];

    it('should show cost price for superadmin in display', () => {
      const superAdminProps = { ...mockProps, parts: partsData, userRole: 'superadmin' };
      render(<CarPartsManagement {...superAdminProps} />);

      expect(screen.getByText('₹1,200.00')).toBeInTheDocument();
    });

    it('should hide cost price for admin in display', () => {
      const adminProps = { ...mockProps, parts: partsData, userRole: 'admin' };
      render(<CarPartsManagement {...adminProps} />);

      // Cost price should not be visible
      const costPriceElements = screen.queryAllByText('₹1,200.00');
      expect(costPriceElements).toHaveLength(0);
    });

    it('should hide cost price for general user in display', () => {
      const generalProps = { ...mockProps, parts: partsData, userRole: 'general' };
      render(<CarPartsManagement {...generalProps} />);

      // Cost price should not be visible
      const costPriceElements = screen.queryAllByText('₹1,200.00');
      expect(costPriceElements).toHaveLength(0);
    });
  });

  describe('Component Lifecycle', () => {
    it('should fetch parts on mount', () => {
      render(<CarPartsManagement {...mockProps} />);
      
      expect(mockProps.fetchParts).toHaveBeenCalled();
    });

    it('should handle checkbox interactions', () => {
      render(<CarPartsManagement {...mockProps} />);
      
      const localPurchaseCheckbox = screen.getByLabelText('Local Purchase');
      fireEvent.click(localPurchaseCheckbox);

      expect(localPurchaseCheckbox.checked).toBe(true);
    });

    it('should handle select dropdown changes', () => {
      render(<CarPartsManagement {...mockProps} />);
      
      const statusSelect = screen.getByDisplayValue('Available');
      fireEvent.change(statusSelect, { target: { value: 'sold' } });

      expect(statusSelect.value).toBe('sold');
    });

    it('should handle date input changes', () => {
      render(<CarPartsManagement {...mockProps} />);
      
      const availableFromInput = screen.getByPlaceholderText('Available From');
      fireEvent.change(availableFromInput, { target: { value: '2023-06-15' } });

      expect(availableFromInput.value).toBe('2023-06-15');
    });
  });
});

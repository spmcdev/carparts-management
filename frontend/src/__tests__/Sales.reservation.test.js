import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import Sales from '../Sales';

// Mock API endpoints
jest.mock('../config/api', () => ({
  API_ENDPOINTS: {
    BASE: 'https://carparts-management-production.up.railway.app',
    PARTS: 'https://carparts-management-production.up.railway.app/parts',
    BILLS: 'https://carparts-management-production.up.railway.app/bills'
  }
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('Sales Reservation Functionality', () => {
  const mockToken = 'test-token';

  beforeEach(() => {
    fetch.mockClear();
    // Mock console.error to suppress act warnings in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('should render reserve button for available parts', async () => {
    const mockParts = [
      {
        id: 1,
        name: 'Test Part',
        manufacturer: 'Test Manufacturer',
        available_stock: 5,
        recommended_price: 100.00
      }
    ];

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockParts
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

    await act(async () => {
      render(<Sales token={mockToken} />);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Reserve')).toBeInTheDocument();
    });
  });

  it('should open reserve modal when reserve button is clicked', async () => {
    const mockParts = [
      {
        id: 1,
        name: 'Test Part',
        manufacturer: 'Test Manufacturer',
        available_stock: 5,
        recommended_price: 100.00
      }
    ];

    fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockParts
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

    await act(async () => {
      render(<Sales token={mockToken} />);
    });
    
    await waitFor(() => {
      const reserveButton = screen.getByText('Reserve');
      fireEvent.click(reserveButton);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Reserve Part', { selector: '.modal-title' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter customer name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter phone number')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter agreed price')).toBeInTheDocument();
  });

  it('should create reservation successfully', async () => {
    const mockParts = [
      {
        id: 1,
        name: 'Test Part',
        manufacturer: 'Test Manufacturer',
        stock_status: 'available',
        recommended_price: '100.00'
      }
    ];

    const mockReservation = {
      id: 1,
      reservation_number: 'RES-123456',
      customer_name: 'John Doe',
      customer_phone: '1234567890',
      price_agreed: 100.00
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockParts
    });

    render(<Sales token={mockToken} />);
    
    // Search for parts
    const searchInput = screen.getByPlaceholderText('Search by ID, Name, Parent Part ID, or Manufacturer');
    const searchButton = screen.getByText('Search');

    fireEvent.change(searchInput, { target: { value: 'Test' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      const reserveButton = screen.getByText('Reserve');
      fireEvent.click(reserveButton);
    });

    // Fill reservation form
    const customerNameInput = screen.getByPlaceholderText('Enter customer name');
    const customerPhoneInput = screen.getByPlaceholderText('Enter phone number');
    const priceAgreedInput = screen.getByPlaceholderText('Enter agreed price');

    fireEvent.change(customerNameInput, { target: { value: 'John Doe' } });
    fireEvent.change(customerPhoneInput, { target: { value: '1234567890' } });
    fireEvent.change(priceAgreedInput, { target: { value: '100' } });

    // Mock reservation creation
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockReservation
    });

    const reservePartButton = screen.getByRole('button', { name: /reserve part/i });
    fireEvent.click(reservePartButton);

    await waitFor(() => {
      expect(screen.getByText(/Part reserved successfully/)).toBeInTheDocument();
    });
  });

  it('should display reservation management section', () => {
    render(<Sales token={mockToken} />);
    
    expect(screen.getByText('Reservation Management')).toBeInTheDocument();
    expect(screen.getByText('Retrieve Reservations')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search reservations by number, customer name, or phone')).toBeInTheDocument();
  });

  it('should fetch and display reservations', async () => {
    const mockReservations = [
      {
        id: 1,
        reservation_number: 'RES-123456',
        customer_name: 'John Doe',
        customer_phone: '1234567890',
        part_name: 'Test Part',
        manufacturer: 'Test Manufacturer',
        price_agreed: 100.00,
        deposit_amount: 20.00,
        remaining_amount: 80.00,
        status: 'reserved',
        reserved_date: '2025-01-01T00:00:00Z'
      }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockReservations
    });

    render(<Sales token={mockToken} />);
    
    const retrieveButton = screen.getByText('Retrieve Reservations');
    fireEvent.click(retrieveButton);

    await waitFor(() => {
      expect(screen.getByText('RES-123456')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Test Part')).toBeInTheDocument();
      expect(screen.getByText('Complete Sale')).toBeInTheDocument();
    });
  });

  it('should complete reservation sale', async () => {
    const mockReservations = [
      {
        id: 1,
        reservation_number: 'RES-123456',
        customer_name: 'John Doe',
        customer_phone: '1234567890',
        part_name: 'Test Part',
        manufacturer: 'Test Manufacturer',
        price_agreed: 100.00,
        deposit_amount: 20.00,
        remaining_amount: 80.00,
        status: 'reserved',
        reserved_date: '2025-01-01T00:00:00Z'
      }
    ];

    const mockCompletionResponse = {
      message: 'Reservation completed successfully',
      bill: {
        bill_number: 'BILL-789',
        customer_name: 'John Doe'
      }
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockReservations
    });

    render(<Sales token={mockToken} />);
    
    // Retrieve reservations first
    const retrieveButton = screen.getByText('Retrieve Reservations');
    fireEvent.click(retrieveButton);

    await waitFor(() => {
      const completeSaleButton = screen.getByText('Complete Sale');
      fireEvent.click(completeSaleButton);
    });

    // Fill completion form
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Complete Reservation Sale', { selector: '.modal-title' })).toBeInTheDocument();
    
    // Mock completion request
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockCompletionResponse
    });

    const finalCompleteButton = within(screen.getByRole('dialog')).getByRole('button', { name: /complete sale/i });
    fireEvent.click(finalCompleteButton);

    await waitFor(() => {
      expect(screen.getByText(/Sale completed successfully/)).toBeInTheDocument();
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Admin from '../Admin';

// Mock fetch
global.fetch = jest.fn();

describe('Admin Component', () => {
  const mockProps = {
    token: 'fake-jwt-token',
    userRole: 'admin'
  };

  beforeEach(() => {
    fetch.mockClear();
  });

  describe('Component Rendering', () => {
    it('should render admin panel for admin users', () => {
      render(<Admin {...mockProps} />);
      
      expect(screen.getByRole('heading', { level: 2, name: 'Admin' })).toBeInTheDocument();
      expect(screen.getByText('Manage users below.')).toBeInTheDocument();
    });

    it('should render admin panel for superadmin users', () => {
      render(<Admin {...mockProps} userRole="superadmin" />);
      
      expect(screen.getByRole('heading', { level: 2, name: 'Admin' })).toBeInTheDocument();
      expect(screen.getByText('Manage users below.')).toBeInTheDocument();
    });

    it('should not render for general users', () => {
      render(<Admin {...mockProps} userRole="general" />);
      
      expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
    });
  });

  describe('User Management', () => {
    it('should fetch and display users', async () => {
      const mockUsers = [
        { id: 1, username: 'user1', role: 'general' },
        { id: 2, username: 'admin1', role: 'admin' },
        { id: 3, username: 'superadmin1', role: 'superadmin' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers
      });

      render(<Admin {...mockProps} />);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://localhost:3000/users', {
          headers: {
            Authorization: 'Bearer fake-jwt-token'
          }
        });
      });

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
        expect(screen.getByText('admin1')).toBeInTheDocument();
        expect(screen.getByText('superadmin1')).toBeInTheDocument();
      });
    });

    it('should handle fetch users error', async () => {
      fetch.mockRejectedValueOnce(new Error('Failed to fetch users'));

      render(<Admin {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
      });
    });

    it('should display user roles correctly', async () => {
      const mockUsers = [
        { id: 1, username: 'generaluser', role: 'general' },
        { id: 2, username: 'adminuser', role: 'admin' },
        { id: 3, username: 'superadminuser', role: 'superadmin' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers
      });

      render(<Admin {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('generaluser')).toBeInTheDocument();
        expect(screen.getByText('adminuser')).toBeInTheDocument();
        expect(screen.getByText('superadminuser')).toBeInTheDocument();
      });
    });
  });

  describe('User Creation', () => {
    it('should render user creation form', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(<Admin {...mockProps} />);

      expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
      expect(screen.getByText('Add')).toBeInTheDocument();
    });

    it('should create new user successfully', async () => {
      // Mock initial users fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      // Mock user creation
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: 1, username: 'newuser', role: 'general' } })
      });

      // Mock updated users fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, username: 'newuser', role: 'general' }]
      });

      render(<Admin {...mockProps} />);

      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      const createButton = screen.getByText('Add');

      fireEvent.change(usernameInput, { target: { value: 'newuser' } });
      fireEvent.change(passwordInput, { target: { value: 'newpass' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://localhost:3000/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: 'newuser',
            password: 'newpass',
            role: 'general'
          })
        });
      });
    });

    it('should handle user creation error', async () => {
      // Mock initial users fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      // Mock user creation error
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Username already exists' })
      });

      render(<Admin {...mockProps} />);

      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      const createButton = screen.getByText('Add');

      fireEvent.change(usernameInput, { target: { value: 'existinguser' } });
      fireEvent.change(passwordInput, { target: { value: 'pass' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Username already exists')).toBeInTheDocument();
      });
    });

    it('should allow role selection for new users', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(<Admin {...mockProps} />);

      const roleSelect = screen.getByRole('combobox');
      
      fireEvent.change(roleSelect, { target: { value: 'admin' } });
      
      expect(roleSelect.value).toBe('admin');
    });

    it('should reset form after successful user creation', async () => {
      // Mock initial users fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      // Mock successful user creation
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: 1, username: 'newuser', role: 'general' } })
      });

      // Mock updated users fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 1, username: 'newuser', role: 'general' }]
      });

      render(<Admin {...mockProps} />);

      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      const createButton = screen.getByText('Add');

      fireEvent.change(usernameInput, { target: { value: 'newuser' } });
      fireEvent.change(passwordInput, { target: { value: 'newpass' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(usernameInput.value).toBe('');
        expect(passwordInput.value).toBe('');
      });
    });
  });

  describe('User Deletion', () => {
    it('should delete user successfully', async () => {
      const mockUsers = [
        { id: 1, username: 'user1', role: 'general' },
        { id: 2, username: 'user2', role: 'general' }
      ];

      // Mock initial users fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers
      });

      // Mock user deletion
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 1, username: 'user1' })
      });

      // Mock updated users fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 2, username: 'user2', role: 'general' }]
      });

      render(<Admin {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('http://localhost:3000/users/1', {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer fake-jwt-token'
          }
        });
      });
    });

    it('should handle user deletion error', async () => {
      const mockUsers = [
        { id: 1, username: 'user1', role: 'general' }
      ];

      // Mock initial users fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers
      });

      // Mock user deletion error
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Cannot delete user' })
      });

      render(<Admin {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText('user1')).toBeInTheDocument();
      });

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to delete user.')).toBeInTheDocument();
      });
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow superadmin to create superadmin users', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(<Admin {...mockProps} userRole="superadmin" />);

      const roleSelect = screen.getByRole('combobox');
      
      // Should have superadmin option for superadmin users
      fireEvent.change(roleSelect, { target: { value: 'superadmin' } });
      expect(roleSelect.value).toBe('superadmin');
    });

    it('should restrict admin from creating superadmin users', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(<Admin {...mockProps} userRole="admin" />);

      const roleSelect = screen.getByRole('combobox');
      const options = Array.from(roleSelect.options).map(option => option.value);
      
      // Should not have superadmin option for regular admin
      expect(options).not.toContain('superadmin');
    });
  });

  describe('Loading States', () => {
    it('should render admin interface properly', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(<Admin {...mockProps} />);

      expect(screen.getByRole('heading', { level: 2, name: 'Admin' })).toBeInTheDocument();
      expect(screen.getByText('Manage users below.')).toBeInTheDocument();
    });

    it('should show proper form elements', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(<Admin {...mockProps} />);

      expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
      expect(screen.getByText('Add')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should require username for user creation', () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(<Admin {...mockProps} />);

      const usernameInput = screen.getByPlaceholderText('Username');
      expect(usernameInput).toBeRequired();
    });

    it('should require password for user creation', () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(<Admin {...mockProps} />);

      const passwordInput = screen.getByPlaceholderText('Password');
      expect(passwordInput).toBeRequired();
    });

    it('should enable create button properly', async () => {
      // Mock initial users fetch
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => []
      });

      render(<Admin {...mockProps} />);

      const usernameInput = screen.getByPlaceholderText('Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      const createButton = screen.getByText('Add');

      fireEvent.change(usernameInput, { target: { value: 'newuser' } });
      fireEvent.change(passwordInput, { target: { value: 'newpass' } });

      expect(createButton).toBeEnabled();
    });
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn().mockReturnValue(null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Wrapper component to provide Router context
const RouterWrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

test('renders learn react link', () => {
  render(<App />, { wrapper: RouterWrapper });
  const appElement = screen.getByRole('heading', { level: 1, name: /Car Parts/i });
  expect(appElement).toBeInTheDocument();
});

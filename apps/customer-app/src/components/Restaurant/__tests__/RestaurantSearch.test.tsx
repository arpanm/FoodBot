import { render, screen, fireEvent } from '@testing-library/react';

import '@testing-library/jest-dom';
import { renderWithProviders } from '../../../test/utils/renderWithProviders';
import { RestaurantSearch } from '../RestaurantSearch';

/**
 * RestaurantSearch Component Tests
 */

// Mock the restaurant slice - return a thunk-like function
const mockSearchRestaurants = jest.fn();
jest.mock('../../../store/slices/restaurantSlice', () => ({
  searchRestaurants: (query: string) => {
    mockSearchRestaurants(query);
    return { type: 'restaurant/search/pending' };
  },
}));

// Mock the useDebounce hook to return empty string to prevent auto-dispatch from useEffect
jest.mock('../../../hooks/useDebounce', () => ({
  useDebounce: () => '',
}));

describe('RestaurantSearch Component', () => {
  beforeEach(() => {
    mockSearchRestaurants.mockClear();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      renderWithProviders(<RestaurantSearch />);
      expect(screen.getByTestId('restaurant-search')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      renderWithProviders(<RestaurantSearch data-testid="my-search" />);
      expect(screen.getByTestId('my-search')).toBeInTheDocument();
    });

    it('renders search input', () => {
      renderWithProviders(<RestaurantSearch />);
      expect(screen.getByTestId('search-input')).toBeInTheDocument();
    });

    it('renders search button', () => {
      renderWithProviders(<RestaurantSearch />);
      expect(screen.getByTestId('search-button')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('renders input with placeholder', () => {
      renderWithProviders(<RestaurantSearch />);
      expect(screen.getByPlaceholderText('Search restaurants...')).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('updates input value when user types', () => {
      renderWithProviders(<RestaurantSearch />);
      const input = screen.getByTestId('search-input');

      fireEvent.change(input, { target: { value: 'Pizza' } });
      expect(input).toHaveValue('Pizza');
    });

    it('dispatches search on button click', () => {
      renderWithProviders(<RestaurantSearch />);

      fireEvent.change(screen.getByTestId('search-input'), { target: { value: 'Pizza' } });
      fireEvent.click(screen.getByTestId('search-button'));

      expect(mockSearchRestaurants).toHaveBeenCalledWith('Pizza');
    });
  });
});

import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders } from '../../../test/utils/renderWithProviders';
import { RestaurantList } from '../RestaurantList';
import { Restaurant } from '../../../types/models';

/**
 * RestaurantList Component Tests
 */

function createRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'rest-1',
    name: 'Test Restaurant',
    description: 'Great food',
    cuisine: ['Italian'],
    logo: 'https://example.com/logo.jpg',
    images: [],
    rating: 4.5,
    reviewCount: 100,
    priceRange: 2,
    deliveryTime: '30 min',
    deliveryFee: 5,
    minimumOrder: 15,
    isOpen: true,
    location: { address: '123 Main St', city: 'SF', state: 'CA', zipCode: '94102', coordinates: { latitude: 37, longitude: -122 } },
    dishes: [],
    tags: [],
    ...overrides,
  } as Restaurant;
}

describe('RestaurantList Component', () => {
  describe('Rendering', () => {
    it('renders restaurant list with prop restaurants', () => {
      const restaurants = [createRestaurant({ id: 'r1', name: 'Restaurant 1' }), createRestaurant({ id: 'r2', name: 'Restaurant 2' })];
      renderWithProviders(<RestaurantList restaurants={restaurants} />);
      expect(screen.getByTestId('restaurant-list')).toBeInTheDocument();
    });

    it('renders each restaurant card', () => {
      const restaurants = [createRestaurant({ id: 'r1', name: 'Resto 1' }), createRestaurant({ id: 'r2', name: 'Resto 2' })];
      renderWithProviders(<RestaurantList restaurants={restaurants} />);
      expect(screen.getByText('Resto 1')).toBeInTheDocument();
      expect(screen.getByText('Resto 2')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      const restaurants = [createRestaurant()];
      renderWithProviders(<RestaurantList restaurants={restaurants} data-testid="custom-list" />);
      expect(screen.getByTestId('custom-list')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no restaurants', () => {
      renderWithProviders(<RestaurantList restaurants={[]} />);
      expect(screen.getByTestId('restaurant-list-empty')).toBeInTheDocument();
      expect(screen.getByText('No restaurants found')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading from store', () => {
      renderWithProviders(<RestaurantList />, {
        initialState: { restaurant: { restaurants: [], loading: true, error: null } },
      });
      expect(screen.getByTestId('restaurant-list-loading')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows error message when error from store', () => {
      renderWithProviders(<RestaurantList />, {
        initialState: { restaurant: { restaurants: [], loading: false, error: 'Failed to load' } },
      });
      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });
  });

  describe('Click Interactions', () => {
    it('calls onSelectRestaurant with restaurant id', () => {
      const handleSelect = jest.fn();
      const restaurants = [createRestaurant({ id: 'rest-42', name: 'My Restaurant' })];
      renderWithProviders(<RestaurantList restaurants={restaurants} onSelectRestaurant={handleSelect} />);

      fireEvent.click(screen.getByTestId('restaurant-card'));
      expect(handleSelect).toHaveBeenCalledWith('rest-42');
    });
  });

  describe('Store Integration', () => {
    it('uses store restaurants when no prop restaurants provided', () => {
      const storeRestaurants = [createRestaurant({ id: 'store-1', name: 'Store Restaurant' })];
      renderWithProviders(<RestaurantList />, {
        initialState: { restaurant: { restaurants: storeRestaurants, loading: false, error: null } },
      });
      expect(screen.getByText('Store Restaurant')).toBeInTheDocument();
    });

    it('prefers prop restaurants over store restaurants', () => {
      const propRestaurants = [createRestaurant({ id: 'prop-1', name: 'Prop Restaurant' })];
      const storeRestaurants = [createRestaurant({ id: 'store-1', name: 'Store Restaurant' })];
      renderWithProviders(<RestaurantList restaurants={propRestaurants} />, {
        initialState: { restaurant: { restaurants: storeRestaurants, loading: false, error: null } },
      });
      expect(screen.getByText('Prop Restaurant')).toBeInTheDocument();
      expect(screen.queryByText('Store Restaurant')).not.toBeInTheDocument();
    });
  });
});

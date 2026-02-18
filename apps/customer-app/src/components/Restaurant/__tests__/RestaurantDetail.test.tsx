import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RestaurantDetail } from '../RestaurantDetail';
import { Restaurant } from '../../../types/models';

/**
 * RestaurantDetail Component Tests
 */

function createRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'rest-1',
    name: 'Pizza Palace',
    description: 'Best pizza in town',
    cuisine: ['Italian', 'American'],
    logo: 'https://example.com/logo.png',
    images: ['https://example.com/img1.jpg'],
    rating: 4.5,
    reviewCount: 200,
    priceRange: 2,
    deliveryTime: '25-35 min',
    deliveryFee: 3.99,
    minimumOrder: 15,
    isOpen: true,
    location: {
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      coordinates: { latitude: 37.7749, longitude: -122.4194 },
    },
    dishes: ['dish-1', 'dish-2'],
    tags: ['Popular', 'Top Rated'],
    ...overrides,
  } as Restaurant;
}

describe('RestaurantDetail Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<RestaurantDetail restaurant={createRestaurant()} />);
      expect(screen.getByTestId('restaurant-detail')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<RestaurantDetail restaurant={createRestaurant()} data-testid="my-detail" />);
      expect(screen.getByTestId('my-detail')).toBeInTheDocument();
    });

    it('displays restaurant name', () => {
      render(<RestaurantDetail restaurant={createRestaurant({ name: 'Sushi Bar' })} />);
      expect(screen.getByTestId('detail-name')).toHaveTextContent('Sushi Bar');
    });

    it('displays restaurant description', () => {
      render(<RestaurantDetail restaurant={createRestaurant({ description: 'Fresh sushi daily' })} />);
      expect(screen.getByTestId('detail-description')).toHaveTextContent('Fresh sushi daily');
    });

    it('displays restaurant logo', () => {
      render(<RestaurantDetail restaurant={createRestaurant({ logo: 'https://example.com/logo.png' })} />);
      expect(screen.getByTestId('detail-logo')).toHaveAttribute('src', 'https://example.com/logo.png');
    });

    it('displays cuisine types', () => {
      render(<RestaurantDetail restaurant={createRestaurant({ cuisine: ['Italian', 'Mexican'] })} />);
      expect(screen.getByTestId('detail-cuisine')).toHaveTextContent('Italian, Mexican');
    });

    it('displays rating and review count', () => {
      render(<RestaurantDetail restaurant={createRestaurant({ rating: 4.5, reviewCount: 200 })} />);
      expect(screen.getByTestId('detail-rating')).toHaveTextContent('4.5');
      expect(screen.getByTestId('detail-rating')).toHaveTextContent('200 reviews');
    });

    it('displays delivery time', () => {
      render(<RestaurantDetail restaurant={createRestaurant({ deliveryTime: '20-30 min' })} />);
      expect(screen.getByTestId('detail-delivery-time')).toHaveTextContent('20-30 min');
    });

    it('displays delivery fee', () => {
      render(<RestaurantDetail restaurant={createRestaurant({ deliveryFee: 3.99 })} />);
      expect(screen.getByTestId('detail-delivery-fee')).toHaveTextContent('$3.99');
    });

    it('displays minimum order', () => {
      render(<RestaurantDetail restaurant={createRestaurant({ minimumOrder: 15 })} />);
      expect(screen.getByTestId('detail-minimum-order')).toHaveTextContent('$15');
    });
  });

  describe('Status', () => {
    it('shows Open when restaurant is open', () => {
      render(<RestaurantDetail restaurant={createRestaurant({ isOpen: true })} />);
      expect(screen.getByTestId('detail-status')).toHaveTextContent('Open');
    });

    it('shows Closed when restaurant is closed', () => {
      render(<RestaurantDetail restaurant={createRestaurant({ isOpen: false })} />);
      expect(screen.getByTestId('detail-status')).toHaveTextContent('Closed');
    });
  });

  describe('Tags', () => {
    it('displays tags when provided', () => {
      render(<RestaurantDetail restaurant={createRestaurant({ tags: ['Popular', 'Featured'] })} />);
      expect(screen.getByTestId('detail-tags')).toBeInTheDocument();
      expect(screen.getByText('Popular')).toBeInTheDocument();
      expect(screen.getByText('Featured')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when restaurant is null', () => {
      render(<RestaurantDetail restaurant={null} />);
      expect(screen.getByTestId('restaurant-detail-empty')).toBeInTheDocument();
      expect(screen.getByText('No restaurant selected')).toBeInTheDocument();
    });
  });

  describe('Back Button', () => {
    it('shows back button when onBack is provided', () => {
      render(<RestaurantDetail restaurant={createRestaurant()} onBack={jest.fn()} />);
      expect(screen.getByTestId('back-button')).toBeInTheDocument();
    });

    it('does not show back button when onBack is not provided', () => {
      render(<RestaurantDetail restaurant={createRestaurant()} />);
      expect(screen.queryByTestId('back-button')).not.toBeInTheDocument();
    });

    it('calls onBack when back button clicked', () => {
      const handleBack = jest.fn();
      render(<RestaurantDetail restaurant={createRestaurant()} onBack={handleBack} />);

      fireEvent.click(screen.getByTestId('back-button'));
      expect(handleBack).toHaveBeenCalledTimes(1);
    });
  });
});

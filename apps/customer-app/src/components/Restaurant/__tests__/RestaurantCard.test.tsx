import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RestaurantCard } from '../RestaurantCard';
import { mockRestaurant, mockClosedRestaurant, mockHighlyRatedRestaurant } from '../../../test/factories/restaurant.factory';
import { Restaurant } from '../../../types/models';

/**
 * RestaurantCard Component Tests
 */

function createRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  const factory = mockRestaurant(overrides as any);
  return {
    id: factory.id,
    name: factory.name,
    description: factory.description,
    cuisine: factory.cuisine,
    logo: factory.logo,
    images: factory.images,
    rating: factory.rating,
    reviewCount: factory.reviewCount,
    priceRange: factory.priceRange,
    deliveryTime: factory.deliveryTime,
    deliveryFee: factory.deliveryFee,
    minimumOrder: factory.minimumOrder,
    isOpen: factory.isOpen,
    location: { address: factory.location.address, city: factory.location.city, state: factory.location.state, zipCode: factory.location.zipCode, coordinates: { latitude: factory.location.latitude, longitude: factory.location.longitude } },
    dishes: factory.dishes,
    tags: factory.tags,
    ...overrides,
  } as Restaurant;
}

describe('RestaurantCard Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      const restaurant = createRestaurant();
      render(<RestaurantCard restaurant={restaurant} />);
      expect(screen.getByTestId('restaurant-card')).toBeInTheDocument();
    });

    it('displays restaurant name', () => {
      const restaurant = createRestaurant({ name: 'Pizza Palace' });
      render(<RestaurantCard restaurant={restaurant} />);
      expect(screen.getByTestId('restaurant-name')).toHaveTextContent('Pizza Palace');
    });

    it('displays restaurant logo', () => {
      const restaurant = createRestaurant({ logo: 'https://example.com/logo.jpg' });
      render(<RestaurantCard restaurant={restaurant} />);
      const logo = screen.getByTestId('restaurant-logo') as HTMLImageElement;
      expect(logo.src).toBe('https://example.com/logo.jpg');
    });

    it('displays cuisine types', () => {
      const restaurant = createRestaurant({ cuisine: ['Italian', 'Mediterranean'] });
      render(<RestaurantCard restaurant={restaurant} />);
      expect(screen.getByTestId('restaurant-cuisine')).toHaveTextContent('Italian, Mediterranean');
    });

    it('displays rating and review count', () => {
      const restaurant = createRestaurant({ rating: 4.5, reviewCount: 250 });
      render(<RestaurantCard restaurant={restaurant} />);
      expect(screen.getByTestId('restaurant-rating')).toHaveTextContent('Rating: 4.5 (250 reviews)');
    });

    it('displays delivery time', () => {
      const restaurant = createRestaurant({ deliveryTime: '30-45 min' });
      render(<RestaurantCard restaurant={restaurant} />);
      expect(screen.getByTestId('restaurant-delivery-time')).toHaveTextContent('30-45 min');
    });

    it('displays price range as dollar signs', () => {
      const restaurant = createRestaurant({ priceRange: 3 });
      render(<RestaurantCard restaurant={restaurant} />);
      expect(screen.getByTestId('restaurant-price-range')).toHaveTextContent('$$$');
    });

    it('renders with custom data-testid', () => {
      const restaurant = createRestaurant();
      render(<RestaurantCard restaurant={restaurant} data-testid="custom-card" />);
      expect(screen.getByTestId('custom-card')).toBeInTheDocument();
    });
  });

  describe('Open/Closed State', () => {
    it('does not show closed badge for open restaurants', () => {
      const restaurant = createRestaurant({ isOpen: true });
      render(<RestaurantCard restaurant={restaurant} />);
      expect(screen.queryByTestId('closed-badge')).not.toBeInTheDocument();
    });

    it('shows closed badge for closed restaurants', () => {
      const restaurant = createRestaurant({ isOpen: false });
      render(<RestaurantCard restaurant={restaurant} />);
      expect(screen.getByTestId('closed-badge')).toBeInTheDocument();
      expect(screen.getByTestId('closed-badge')).toHaveTextContent('Closed');
    });

    it('applies closed class for closed restaurants', () => {
      const restaurant = createRestaurant({ isOpen: false });
      render(<RestaurantCard restaurant={restaurant} />);
      expect(screen.getByTestId('restaurant-card')).toHaveClass('closed');
    });

    it('does not apply closed class for open restaurants', () => {
      const restaurant = createRestaurant({ isOpen: true });
      render(<RestaurantCard restaurant={restaurant} />);
      expect(screen.getByTestId('restaurant-card')).not.toHaveClass('closed');
    });
  });

  describe('Click Interactions', () => {
    it('calls onClick with restaurant id when clicked', () => {
      const handleClick = jest.fn();
      const restaurant = createRestaurant({ id: 'rest-123' });
      render(<RestaurantCard restaurant={restaurant} onClick={handleClick} />);

      fireEvent.click(screen.getByTestId('restaurant-card'));

      expect(handleClick).toHaveBeenCalledWith('rest-123');
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles multiple clicks', () => {
      const handleClick = jest.fn();
      const restaurant = createRestaurant();
      render(<RestaurantCard restaurant={restaurant} onClick={handleClick} />);

      const card = screen.getByTestId('restaurant-card');
      fireEvent.click(card);
      fireEvent.click(card);
      fireEvent.click(card);

      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    it('works without onClick handler', () => {
      const restaurant = createRestaurant();
      render(<RestaurantCard restaurant={restaurant} />);

      expect(() => {
        fireEvent.click(screen.getByTestId('restaurant-card'));
      }).not.toThrow();
    });
  });

  describe('Price Range Display', () => {
    it('displays price range 1', () => {
      const restaurant = createRestaurant({ priceRange: 1 });
      render(<RestaurantCard restaurant={restaurant} />);
      expect(screen.getByTestId('restaurant-price-range')).toHaveTextContent('$');
    });

    it('displays price range 2', () => {
      const restaurant = createRestaurant({ priceRange: 2 });
      render(<RestaurantCard restaurant={restaurant} />);
      expect(screen.getByTestId('restaurant-price-range')).toHaveTextContent('$$');
    });

    it('displays price range 4', () => {
      const restaurant = createRestaurant({ priceRange: 4 });
      render(<RestaurantCard restaurant={restaurant} />);
      expect(screen.getByTestId('restaurant-price-range')).toHaveTextContent('$$$$');
    });
  });

  describe('Image Handling', () => {
    it('sets correct alt text for logo', () => {
      const restaurant = createRestaurant({ name: 'Test Restaurant' });
      render(<RestaurantCard restaurant={restaurant} />);
      const logo = screen.getByTestId('restaurant-logo');
      expect(logo).toHaveAttribute('alt', 'Test Restaurant');
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      const restaurant = createRestaurant();
      render(<RestaurantCard restaurant={restaurant} />);
      const heading = screen.getByTestId('restaurant-name');
      expect(heading.tagName).toBe('H3');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty cuisine array', () => {
      const restaurant = createRestaurant({ cuisine: [] });
      render(<RestaurantCard restaurant={restaurant} />);
      expect(screen.getByTestId('restaurant-cuisine')).toHaveTextContent('');
    });

    it('handles special characters in name', () => {
      const restaurant = createRestaurant({ name: "Luigi's Pizza & Pasta" });
      render(<RestaurantCard restaurant={restaurant} />);
      expect(screen.getByTestId('restaurant-name')).toHaveTextContent("Luigi's Pizza & Pasta");
    });
  });
});

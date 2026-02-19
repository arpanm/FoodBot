import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { SearchResults } from '../SearchResults';
import type { Restaurant, Dish } from '../../../types/models';

// Factory helpers for test data
function createRestaurant(overrides: Partial<Restaurant> = {}): Restaurant {
  return {
    id: 'rest-1',
    name: 'Pizza Palace',
    description: 'Authentic Italian pizza',
    cuisine: ['Italian', 'Pizza'],
    logo: 'https://example.com/logo.jpg',
    images: ['https://example.com/img1.jpg'],
    rating: 4.5,
    reviewCount: 250,
    priceRange: 2,
    deliveryTime: '30-45 min',
    deliveryFee: 5.99,
    minimumOrder: 15,
    isOpen: true,
    location: {
      address: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      coordinates: { latitude: 37.7749, longitude: -122.4194 },
    },
    dishes: ['dish-1'],
    tags: ['Popular', 'Fast Delivery'],
    ...overrides,
  } as Restaurant;
}

function createDish(overrides: Partial<Dish> = {}): Dish {
  return {
    id: 'dish-1',
    name: 'Margherita Pizza',
    description: 'Classic pizza with fresh mozzarella',
    price: 12.99,
    images: ['https://example.com/dish.jpg'],
    category: 'main_course',
    restaurantId: 'rest-1',
    restaurantName: 'Pizza Palace',
    isAvailable: true,
    rating: 4.3,
    reviewCount: 87,
    tags: ['Popular'],
    dietary: {
      isVegetarian: true,
      isVegan: false,
      isGlutenFree: false,
      isDairyFree: false,
      isNutFree: true,
      isHalal: false,
      isKosher: false,
    },
    ingredients: ['Mozzarella', 'Tomatoes', 'Basil'],
    allergens: ['Dairy', 'Gluten'],
    customizations: [],
    nutritionalInfo: {
      calories: 450,
      protein: 20,
      carbohydrates: 50,
      fat: 18,
    },
    ...overrides,
  } as Dish;
}

describe('SearchResults Component', () => {
  const mockOnPageChange = jest.fn();
  const mockOnRestaurantClick = jest.fn();
  const mockOnDishClick = jest.fn();

  const defaultProps = {
    totalResults: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
    onPageChange: mockOnPageChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading spinner when loading', () => {
      render(<SearchResults {...defaultProps} loading={true} />);
      expect(screen.getByTestId('search-results-loading')).toBeInTheDocument();
    });

    it('does not render results when loading', () => {
      render(
        <SearchResults
          {...defaultProps}
          loading={true}
          restaurants={[createRestaurant()]}
          totalResults={1}
        />
      );
      expect(screen.queryByTestId('restaurant-results')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('renders error message when error is present', () => {
      render(
        <SearchResults {...defaultProps} error="Search service unavailable" />
      );
      expect(screen.getByTestId('search-results-error')).toBeInTheDocument();
      expect(
        screen.getByText('Search service unavailable')
      ).toBeInTheDocument();
    });

    it('does not render results when error is present', () => {
      render(
        <SearchResults
          {...defaultProps}
          error="Error"
          restaurants={[createRestaurant()]}
          totalResults={1}
        />
      );
      expect(screen.queryByTestId('restaurant-results')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('renders empty message when no results', () => {
      render(<SearchResults {...defaultProps} totalResults={0} />);
      expect(screen.getByTestId('search-results-empty')).toBeInTheDocument();
      expect(
        screen.getByText(
          'No results found. Try adjusting your search or filters.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Restaurant Results', () => {
    it('renders restaurant results', () => {
      const restaurants = [
        createRestaurant({ id: 'r1', name: 'Pizza Palace' }),
        createRestaurant({ id: 'r2', name: 'Burger Joint' }),
      ];

      render(
        <SearchResults
          {...defaultProps}
          restaurants={restaurants}
          totalResults={2}
        />
      );

      expect(screen.getByTestId('restaurant-results')).toBeInTheDocument();
      expect(screen.getByText('Restaurants')).toBeInTheDocument();
      expect(screen.getByText('Pizza Palace')).toBeInTheDocument();
      expect(screen.getByText('Burger Joint')).toBeInTheDocument();
    });

    it('renders restaurant metadata', () => {
      const restaurants = [
        createRestaurant({
          id: 'r1',
          name: 'Pizza Palace',
          rating: 4.5,
          cuisine: ['Italian', 'Pizza'],
          deliveryTime: '30-45 min',
          tags: ['Popular', 'Fast'],
        }),
      ];

      render(
        <SearchResults
          {...defaultProps}
          restaurants={restaurants}
          totalResults={1}
        />
      );

      expect(screen.getByText('4.5')).toBeInTheDocument();
      expect(screen.getByText('Italian, Pizza')).toBeInTheDocument();
      expect(screen.getByText('30-45 min')).toBeInTheDocument();
      expect(screen.getByText('Popular')).toBeInTheDocument();
    });

    it('calls onRestaurantClick when restaurant is clicked', () => {
      const restaurant = createRestaurant({ id: 'r1' });

      render(
        <SearchResults
          {...defaultProps}
          restaurants={[restaurant]}
          totalResults={1}
          onRestaurantClick={mockOnRestaurantClick}
        />
      );

      fireEvent.click(screen.getByTestId('restaurant-result-r1'));

      expect(mockOnRestaurantClick).toHaveBeenCalledWith(restaurant);
    });

    it('limits tags to 3', () => {
      const restaurants = [
        createRestaurant({
          id: 'r1',
          tags: ['Tag1', 'Tag2', 'Tag3', 'Tag4', 'Tag5'],
        }),
      ];

      render(
        <SearchResults
          {...defaultProps}
          restaurants={restaurants}
          totalResults={1}
        />
      );

      expect(screen.getByText('Tag1')).toBeInTheDocument();
      expect(screen.getByText('Tag2')).toBeInTheDocument();
      expect(screen.getByText('Tag3')).toBeInTheDocument();
      expect(screen.queryByText('Tag4')).not.toBeInTheDocument();
      expect(screen.queryByText('Tag5')).not.toBeInTheDocument();
    });
  });

  describe('Dish Results', () => {
    it('renders dish results', () => {
      const dishes = [
        createDish({ id: 'd1', name: 'Margherita Pizza' }),
        createDish({ id: 'd2', name: 'Caesar Salad' }),
      ];

      render(
        <SearchResults
          {...defaultProps}
          dishes={dishes}
          totalResults={2}
        />
      );

      expect(screen.getByTestId('dish-results')).toBeInTheDocument();
      expect(screen.getByText('Dishes')).toBeInTheDocument();
      expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
      expect(screen.getByText('Caesar Salad')).toBeInTheDocument();
    });

    it('renders dish price and rating', () => {
      const dishes = [
        createDish({
          id: 'd1',
          name: 'Margherita Pizza',
          price: 12.99,
          rating: 4.3,
          category: 'main_course',
        }),
      ];

      render(
        <SearchResults {...defaultProps} dishes={dishes} totalResults={1} />
      );

      expect(screen.getByText('$12.99')).toBeInTheDocument();
      expect(screen.getByText('4.3')).toBeInTheDocument();
      expect(screen.getByText('main_course')).toBeInTheDocument();
    });

    it('calls onDishClick when dish is clicked', () => {
      const dish = createDish({ id: 'd1' });

      render(
        <SearchResults
          {...defaultProps}
          dishes={[dish]}
          totalResults={1}
          onDishClick={mockOnDishClick}
        />
      );

      fireEvent.click(screen.getByTestId('dish-result-d1'));

      expect(mockOnDishClick).toHaveBeenCalledWith(dish);
    });
  });

  describe('Mixed Results', () => {
    it('renders both restaurant and dish results', () => {
      const restaurants = [createRestaurant({ id: 'r1' })];
      const dishes = [createDish({ id: 'd1' })];

      render(
        <SearchResults
          {...defaultProps}
          restaurants={restaurants}
          dishes={dishes}
          totalResults={2}
        />
      );

      expect(screen.getByTestId('restaurant-results')).toBeInTheDocument();
      expect(screen.getByTestId('dish-results')).toBeInTheDocument();
    });
  });

  describe('Result Summary', () => {
    it('displays result summary text', () => {
      render(
        <SearchResults
          {...defaultProps}
          restaurants={[createRestaurant()]}
          totalResults={50}
          page={1}
          pageSize={20}
        />
      );

      expect(screen.getByTestId('search-results-summary')).toHaveTextContent(
        'Showing 1-20 of 50 results'
      );
    });

    it('displays query time in summary', () => {
      render(
        <SearchResults
          {...defaultProps}
          restaurants={[createRestaurant()]}
          totalResults={50}
          page={1}
          pageSize={20}
          queryTimeMs={42}
        />
      );

      expect(screen.getByTestId('search-results-summary')).toHaveTextContent(
        'Showing 1-20 of 50 results (42ms)'
      );
    });

    it('shows correct range for last page', () => {
      render(
        <SearchResults
          {...defaultProps}
          restaurants={[createRestaurant()]}
          totalResults={45}
          page={3}
          pageSize={20}
          totalPages={3}
        />
      );

      expect(screen.getByTestId('search-results-summary')).toHaveTextContent(
        'Showing 41-45 of 45 results'
      );
    });
  });

  describe('Pagination', () => {
    it('does not render pagination for single page', () => {
      render(
        <SearchResults
          {...defaultProps}
          restaurants={[createRestaurant()]}
          totalResults={5}
          totalPages={1}
        />
      );

      expect(screen.queryByTestId('search-pagination')).not.toBeInTheDocument();
    });

    it('renders pagination for multiple pages', () => {
      render(
        <SearchResults
          {...defaultProps}
          restaurants={[createRestaurant()]}
          totalResults={50}
          totalPages={3}
        />
      );

      expect(screen.getByTestId('search-pagination')).toBeInTheDocument();
      expect(screen.getByTestId('pagination-prev')).toBeInTheDocument();
      expect(screen.getByTestId('pagination-next')).toBeInTheDocument();
      expect(screen.getByTestId('pagination-info')).toHaveTextContent(
        'Page 1 of 3'
      );
    });

    it('disables previous button on first page', () => {
      render(
        <SearchResults
          {...defaultProps}
          restaurants={[createRestaurant()]}
          totalResults={50}
          page={1}
          totalPages={3}
        />
      );

      expect(screen.getByTestId('pagination-prev')).toBeDisabled();
    });

    it('disables next button on last page', () => {
      render(
        <SearchResults
          {...defaultProps}
          restaurants={[createRestaurant()]}
          totalResults={50}
          page={3}
          totalPages={3}
        />
      );

      expect(screen.getByTestId('pagination-next')).toBeDisabled();
    });

    it('calls onPageChange with previous page on prev click', () => {
      render(
        <SearchResults
          {...defaultProps}
          restaurants={[createRestaurant()]}
          totalResults={50}
          page={2}
          totalPages={3}
        />
      );

      fireEvent.click(screen.getByTestId('pagination-prev'));
      expect(mockOnPageChange).toHaveBeenCalledWith(1);
    });

    it('calls onPageChange with next page on next click', () => {
      render(
        <SearchResults
          {...defaultProps}
          restaurants={[createRestaurant()]}
          totalResults={50}
          page={1}
          totalPages={3}
        />
      );

      fireEvent.click(screen.getByTestId('pagination-next'));
      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });

    it('does not call onPageChange when prev clicked on first page', () => {
      render(
        <SearchResults
          {...defaultProps}
          restaurants={[createRestaurant()]}
          totalResults={50}
          page={1}
          totalPages={3}
        />
      );

      fireEvent.click(screen.getByTestId('pagination-prev'));
      expect(mockOnPageChange).not.toHaveBeenCalled();
    });

    it('does not call onPageChange when next clicked on last page', () => {
      render(
        <SearchResults
          {...defaultProps}
          restaurants={[createRestaurant()]}
          totalResults={50}
          page={3}
          totalPages={3}
        />
      );

      fireEvent.click(screen.getByTestId('pagination-next'));
      expect(mockOnPageChange).not.toHaveBeenCalled();
    });
  });

  describe('Custom data-testid', () => {
    it('uses custom data-testid', () => {
      render(
        <SearchResults
          {...defaultProps}
          restaurants={[createRestaurant()]}
          totalResults={1}
          data-testid="custom-results"
        />
      );

      expect(screen.getByTestId('custom-results')).toBeInTheDocument();
    });
  });
});

import { render, screen, fireEvent } from '@testing-library/react';

import '@testing-library/jest-dom';
import type { Dish } from '../../../types/models';
import { DishList } from '../DishList';

/**
 * DishList Component Tests
 */

function createDish(overrides: Partial<Dish> = {}): Dish {
  return {
    id: 'dish-1',
    name: 'Margherita Pizza',
    description: 'Classic pizza with fresh mozzarella',
    price: 12.99,
    images: ['https://example.com/pizza.jpg'],
    category: 'main_course',
    restaurantId: 'rest-1',
    restaurantName: 'Test Restaurant',
    isAvailable: true,
    rating: 4.5,
    reviewCount: 100,
    tags: ['Popular'],
    dietary: { isVegetarian: true, isVegan: false, isGlutenFree: false, isDairyFree: false, isNutFree: true, isHalal: false, isKosher: false },
    ingredients: ['Tomato', 'Mozzarella'],
    allergens: ['Dairy'],
    customizations: [],
    nutritionalInfo: { calories: 300, protein: 12, carbohydrates: 35, fat: 10 },
    ...overrides,
  } as Dish;
}

function createDishes(count: number): Dish[] {
  return Array.from({ length: count }, (_, i) =>
    createDish({ id: `dish-${i + 1}`, name: `Dish ${i + 1}` })
  );
}

describe('DishList Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<DishList dishes={createDishes(3)} />);
      expect(screen.getByTestId('dish-list')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<DishList dishes={createDishes(2)} data-testid="my-dish-list" />);
      expect(screen.getByTestId('my-dish-list')).toBeInTheDocument();
    });

    it('renders all dishes', () => {
      render(<DishList dishes={createDishes(3)} />);
      expect(screen.getByText('Dish 1')).toBeInTheDocument();
      expect(screen.getByText('Dish 2')).toBeInTheDocument();
      expect(screen.getByText('Dish 3')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no dishes', () => {
      render(<DishList dishes={[]} />);
      expect(screen.getByTestId('dish-list-empty')).toBeInTheDocument();
      expect(screen.getByText('No dishes available')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      render(<DishList dishes={[]} loading />);
      expect(screen.getByTestId('dish-list-loading')).toBeInTheDocument();
    });

    it('does not show dishes when loading', () => {
      render(<DishList dishes={createDishes(3)} loading />);
      expect(screen.queryByTestId('dish-list')).not.toBeInTheDocument();
    });
  });

  describe('Category Filtering', () => {
    it('filters dishes by category', () => {
      const dishes = [
        createDish({ id: 'dish-1', name: 'Pizza', category: 'main_course' }),
        createDish({ id: 'dish-2', name: 'Salad', category: 'appetizer' }),
        createDish({ id: 'dish-3', name: 'Pasta', category: 'main_course' }),
      ];
      render(<DishList dishes={dishes} category="main_course" />);

      expect(screen.getByText('Pizza')).toBeInTheDocument();
      expect(screen.getByText('Pasta')).toBeInTheDocument();
      expect(screen.queryByText('Salad')).not.toBeInTheDocument();
    });

    it('shows all dishes when no category specified', () => {
      const dishes = [
        createDish({ id: 'dish-1', name: 'Pizza', category: 'main_course' }),
        createDish({ id: 'dish-2', name: 'Salad', category: 'appetizer' }),
      ];
      render(<DishList dishes={dishes} />);

      expect(screen.getByText('Pizza')).toBeInTheDocument();
      expect(screen.getByText('Salad')).toBeInTheDocument();
    });

    it('shows empty state when no dishes match category', () => {
      const dishes = [
        createDish({ id: 'dish-1', name: 'Pizza', category: 'main_course' }),
      ];
      render(<DishList dishes={dishes} category="dessert" />);

      expect(screen.getByTestId('dish-list-empty')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('passes onAddToCart to DishCards', () => {
      const handleAddToCart = jest.fn();
      const dishes = [createDish()];
      render(<DishList dishes={dishes} onAddToCart={handleAddToCart} />);

      fireEvent.click(screen.getByTestId('add-to-cart-button'));
      expect(handleAddToCart).toHaveBeenCalled();
    });

    it('passes onSelectDish to DishCards as onClick', () => {
      const handleSelect = jest.fn();
      const dishes = [createDish({ id: 'dish-42' })];
      render(<DishList dishes={dishes} onSelectDish={handleSelect} />);

      fireEvent.click(screen.getByTestId('dish-card'));
      expect(handleSelect).toHaveBeenCalledWith('dish-42');
    });
  });
});

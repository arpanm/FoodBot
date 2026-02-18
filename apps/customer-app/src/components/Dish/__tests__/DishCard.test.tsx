import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DishCard } from '../DishCard';
import { Dish } from '../../../types/models';

/**
 * DishCard Component Tests
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

describe('DishCard Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<DishCard dish={createDish()} />);
      expect(screen.getByTestId('dish-card')).toBeInTheDocument();
    });

    it('displays dish name', () => {
      render(<DishCard dish={createDish({ name: 'Caesar Salad' })} />);
      expect(screen.getByTestId('dish-name')).toHaveTextContent('Caesar Salad');
    });

    it('displays dish description', () => {
      render(<DishCard dish={createDish({ description: 'Fresh and crispy' })} />);
      expect(screen.getByTestId('dish-description')).toHaveTextContent('Fresh and crispy');
    });

    it('displays dish price', () => {
      render(<DishCard dish={createDish({ price: 14.50 })} />);
      expect(screen.getByTestId('dish-price')).toHaveTextContent('$14.50');
    });

    it('displays dish rating', () => {
      render(<DishCard dish={createDish({ rating: 4.5, reviewCount: 100 })} />);
      expect(screen.getByTestId('dish-rating')).toHaveTextContent('4.5 (100 reviews)');
    });

    it('displays dish image when available', () => {
      render(<DishCard dish={createDish({ images: ['https://example.com/img.jpg'] })} />);
      expect(screen.getByTestId('dish-image')).toHaveAttribute('src', 'https://example.com/img.jpg');
    });

    it('does not display image when no images', () => {
      render(<DishCard dish={createDish({ images: [] })} />);
      expect(screen.queryByTestId('dish-image')).not.toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<DishCard dish={createDish()} data-testid="custom-dish" />);
      expect(screen.getByTestId('custom-dish')).toBeInTheDocument();
    });
  });

  describe('Dietary Tags', () => {
    it('displays Vegetarian tag', () => {
      render(<DishCard dish={createDish({ dietary: { isVegetarian: true, isVegan: false, isGlutenFree: false, isDairyFree: false, isNutFree: true, isHalal: false, isKosher: false } })} />);
      expect(screen.getByTestId('dietary-tags')).toBeInTheDocument();
      expect(screen.getByText('Vegetarian')).toBeInTheDocument();
    });

    it('displays Vegan tag', () => {
      render(<DishCard dish={createDish({ dietary: { isVegetarian: false, isVegan: true, isGlutenFree: false, isDairyFree: false, isNutFree: true, isHalal: false, isKosher: false } })} />);
      expect(screen.getByText('Vegan')).toBeInTheDocument();
    });

    it('displays Gluten Free tag', () => {
      render(<DishCard dish={createDish({ dietary: { isVegetarian: false, isVegan: false, isGlutenFree: true, isDairyFree: false, isNutFree: true, isHalal: false, isKosher: false } })} />);
      expect(screen.getByText('Gluten Free')).toBeInTheDocument();
    });

    it('does not display dietary tags when none apply', () => {
      render(<DishCard dish={createDish({ dietary: { isVegetarian: false, isVegan: false, isGlutenFree: false, isDairyFree: false, isNutFree: true, isHalal: false, isKosher: false } })} />);
      expect(screen.queryByTestId('dietary-tags')).not.toBeInTheDocument();
    });
  });

  describe('Availability', () => {
    it('shows unavailable badge when not available', () => {
      render(<DishCard dish={createDish({ isAvailable: false })} />);
      expect(screen.getByTestId('unavailable-badge')).toBeInTheDocument();
    });

    it('does not show unavailable badge when available', () => {
      render(<DishCard dish={createDish({ isAvailable: true })} />);
      expect(screen.queryByTestId('unavailable-badge')).not.toBeInTheDocument();
    });

    it('applies unavailable class when not available', () => {
      render(<DishCard dish={createDish({ isAvailable: false })} />);
      expect(screen.getByTestId('dish-card')).toHaveClass('unavailable');
    });
  });

  describe('Add to Cart', () => {
    it('shows add to cart button when available and onAddToCart provided', () => {
      render(<DishCard dish={createDish({ isAvailable: true })} onAddToCart={jest.fn()} />);
      expect(screen.getByTestId('add-to-cart-button')).toBeInTheDocument();
    });

    it('does not show add to cart button when unavailable', () => {
      render(<DishCard dish={createDish({ isAvailable: false })} onAddToCart={jest.fn()} />);
      expect(screen.queryByTestId('add-to-cart-button')).not.toBeInTheDocument();
    });

    it('calls onAddToCart with dish when clicked', () => {
      const handleAdd = jest.fn();
      const dish = createDish();
      render(<DishCard dish={dish} onAddToCart={handleAdd} />);

      fireEvent.click(screen.getByTestId('add-to-cart-button'));
      expect(handleAdd).toHaveBeenCalledWith(dish);
    });

    it('stops propagation when add to cart clicked', () => {
      const handleClick = jest.fn();
      const handleAdd = jest.fn();
      render(<DishCard dish={createDish()} onClick={handleClick} onAddToCart={handleAdd} />);

      fireEvent.click(screen.getByTestId('add-to-cart-button'));
      expect(handleAdd).toHaveBeenCalled();
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Click Interactions', () => {
    it('calls onClick with dish id', () => {
      const handleClick = jest.fn();
      render(<DishCard dish={createDish({ id: 'dish-42' })} onClick={handleClick} />);

      fireEvent.click(screen.getByTestId('dish-card'));
      expect(handleClick).toHaveBeenCalledWith('dish-42');
    });
  });
});

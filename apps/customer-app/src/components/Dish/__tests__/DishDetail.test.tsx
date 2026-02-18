import { render, screen, fireEvent } from '@testing-library/react';

import '@testing-library/jest-dom';
import type { Dish } from '../../../types/models';
import { DishDetail } from '../DishDetail';

/**
 * DishDetail Component Tests
 */

function createDish(overrides: Partial<Dish> = {}): Dish {
  return {
    id: 'dish-1',
    name: 'Margherita Pizza',
    description: 'Classic pizza with fresh mozzarella and basil',
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
    ingredients: ['Tomato', 'Mozzarella', 'Basil'],
    allergens: ['Dairy', 'Gluten'],
    customizations: [],
    nutritionalInfo: { calories: 300, protein: 12, carbohydrates: 35, fat: 10 },
    ...overrides,
  } as Dish;
}

describe('DishDetail Component', () => {
  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<DishDetail dish={createDish()} />);
      expect(screen.getByTestId('dish-detail')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<DishDetail dish={createDish()} data-testid="my-dish-detail" />);
      expect(screen.getByTestId('my-dish-detail')).toBeInTheDocument();
    });

    it('displays dish name', () => {
      render(<DishDetail dish={createDish({ name: 'Caesar Salad' })} />);
      expect(screen.getByTestId('detail-dish-name')).toHaveTextContent('Caesar Salad');
    });

    it('displays dish description', () => {
      render(<DishDetail dish={createDish({ description: 'Fresh and crispy' })} />);
      expect(screen.getByTestId('detail-dish-description')).toHaveTextContent('Fresh and crispy');
    });

    it('displays dish price', () => {
      render(<DishDetail dish={createDish({ price: 14.99 })} />);
      expect(screen.getByTestId('detail-dish-price')).toHaveTextContent('$14.99');
    });

    it('displays dish image when available', () => {
      render(<DishDetail dish={createDish({ images: ['https://example.com/img.jpg'] })} />);
      expect(screen.getByTestId('detail-dish-image')).toHaveAttribute('src', 'https://example.com/img.jpg');
    });

    it('does not display image when no images', () => {
      render(<DishDetail dish={createDish({ images: [] })} />);
      expect(screen.queryByTestId('detail-dish-image')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when dish is null', () => {
      render(<DishDetail dish={null} />);
      expect(screen.getByTestId('dish-detail-empty')).toBeInTheDocument();
      expect(screen.getByText('No dish selected')).toBeInTheDocument();
    });
  });

  describe('Nutritional Info', () => {
    it('displays nutritional information', () => {
      render(<DishDetail dish={createDish()} />);
      expect(screen.getByTestId('nutritional-info')).toBeInTheDocument();
      expect(screen.getByText('Nutritional Information')).toBeInTheDocument();
      expect(screen.getByText(/Calories: 300/)).toBeInTheDocument();
    });
  });

  describe('Allergens', () => {
    it('displays allergen information', () => {
      render(<DishDetail dish={createDish({ allergens: ['Dairy', 'Gluten'] })} />);
      expect(screen.getByTestId('allergen-info')).toBeInTheDocument();
      expect(screen.getByText('Dairy')).toBeInTheDocument();
      expect(screen.getByText('Gluten')).toBeInTheDocument();
    });

    it('does not display allergens when empty', () => {
      render(<DishDetail dish={createDish({ allergens: [] })} />);
      expect(screen.queryByTestId('allergen-info')).not.toBeInTheDocument();
    });
  });

  describe('Customizations', () => {
    it('renders single-choice customization with radio buttons', () => {
      const dish = createDish({
        customizations: [{
          id: 'size',
          name: 'Size',
          type: 'single',
          required: true,
          options: [
            { id: 'small', name: 'Small', priceModifier: 0 },
            { id: 'large', name: 'Large', priceModifier: 3 },
          ],
        }],
      });
      render(<DishDetail dish={dish} />);

      expect(screen.getByTestId('customization-size')).toBeInTheDocument();
      expect(screen.getByTestId('option-small')).toHaveAttribute('type', 'radio');
      expect(screen.getByTestId('option-large')).toHaveAttribute('type', 'radio');
    });

    it('renders multiple-choice customization with checkboxes', () => {
      const dish = createDish({
        customizations: [{
          id: 'toppings',
          name: 'Toppings',
          type: 'multiple',
          required: false,
          options: [
            { id: 'cheese', name: 'Extra Cheese', priceModifier: 1.5 },
            { id: 'mushrooms', name: 'Mushrooms', priceModifier: 1 },
          ],
        }],
      });
      render(<DishDetail dish={dish} />);

      expect(screen.getByTestId('customization-toppings')).toBeInTheDocument();
      expect(screen.getByTestId('option-cheese')).toHaveAttribute('type', 'checkbox');
      expect(screen.getByTestId('option-mushrooms')).toHaveAttribute('type', 'checkbox');
    });

    it('shows required indicator for required customizations', () => {
      const dish = createDish({
        customizations: [{
          id: 'size',
          name: 'Size',
          type: 'single',
          required: true,
          options: [{ id: 'small', name: 'Small', priceModifier: 0 }],
        }],
      });
      render(<DishDetail dish={dish} />);
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('shows price modifier for options', () => {
      const dish = createDish({
        customizations: [{
          id: 'size',
          name: 'Size',
          type: 'single',
          required: false,
          options: [
            { id: 'large', name: 'Large', priceModifier: 3 },
          ],
        }],
      });
      render(<DishDetail dish={dish} />);
      expect(screen.getByText(/\+\$3.00/)).toBeInTheDocument();
    });

    it('selects single-choice option via radio', () => {
      const dish = createDish({
        customizations: [{
          id: 'size',
          name: 'Size',
          type: 'single',
          required: false,
          options: [
            { id: 'small', name: 'Small', priceModifier: 0 },
            { id: 'large', name: 'Large', priceModifier: 3 },
          ],
        }],
      });
      render(<DishDetail dish={dish} />);

      fireEvent.click(screen.getByTestId('option-large'));
      expect(screen.getByTestId('option-large')).toBeChecked();
    });

    it('toggles multiple-choice option via checkbox', () => {
      const dish = createDish({
        customizations: [{
          id: 'toppings',
          name: 'Toppings',
          type: 'multiple',
          required: false,
          options: [
            { id: 'cheese', name: 'Extra Cheese', priceModifier: 1.5 },
          ],
        }],
      });
      render(<DishDetail dish={dish} />);

      fireEvent.click(screen.getByTestId('option-cheese'));
      expect(screen.getByTestId('option-cheese')).toBeChecked();

      fireEvent.click(screen.getByTestId('option-cheese'));
      expect(screen.getByTestId('option-cheese')).not.toBeChecked();
    });
  });

  describe('Quantity Control', () => {
    it('renders quantity control', () => {
      render(<DishDetail dish={createDish()} />);
      expect(screen.getByTestId('quantity-control')).toBeInTheDocument();
      expect(screen.getByTestId('quantity-value')).toHaveTextContent('1');
    });

    it('increases quantity', () => {
      render(<DishDetail dish={createDish()} />);

      fireEvent.click(screen.getByTestId('quantity-increase'));
      expect(screen.getByTestId('quantity-value')).toHaveTextContent('2');
    });

    it('decreases quantity', () => {
      render(<DishDetail dish={createDish()} />);

      fireEvent.click(screen.getByTestId('quantity-increase'));
      fireEvent.click(screen.getByTestId('quantity-increase'));
      fireEvent.click(screen.getByTestId('quantity-decrease'));
      expect(screen.getByTestId('quantity-value')).toHaveTextContent('2');
    });

    it('does not go below 1', () => {
      render(<DishDetail dish={createDish()} />);

      fireEvent.click(screen.getByTestId('quantity-decrease'));
      expect(screen.getByTestId('quantity-value')).toHaveTextContent('1');
    });
  });

  describe('Add to Cart', () => {
    it('shows add to cart button when onAddToCart provided', () => {
      render(<DishDetail dish={createDish()} onAddToCart={jest.fn()} />);
      expect(screen.getByTestId('add-to-cart-detail')).toBeInTheDocument();
    });

    it('does not show add to cart button when onAddToCart not provided', () => {
      render(<DishDetail dish={createDish()} />);
      expect(screen.queryByTestId('add-to-cart-detail')).not.toBeInTheDocument();
    });

    it('shows correct price in add to cart button', () => {
      render(<DishDetail dish={createDish({ price: 12.99 })} onAddToCart={jest.fn()} />);
      expect(screen.getByTestId('add-to-cart-detail')).toHaveTextContent('$12.99');
    });

    it('updates price when quantity changes', () => {
      render(<DishDetail dish={createDish({ price: 10 })} onAddToCart={jest.fn()} />);

      fireEvent.click(screen.getByTestId('quantity-increase'));
      expect(screen.getByTestId('add-to-cart-detail')).toHaveTextContent('$20.00');
    });

    it('calls onAddToCart with dish and customizations', () => {
      const handleAddToCart = jest.fn();
      const dish = createDish();
      render(<DishDetail dish={dish} onAddToCart={handleAddToCart} />);

      fireEvent.click(screen.getByTestId('add-to-cart-detail'));
      expect(handleAddToCart).toHaveBeenCalledWith(dish, {
        customizations: {},
        quantity: 1,
      });
    });

    it('calls onAddToCart with updated quantity', () => {
      const handleAddToCart = jest.fn();
      const dish = createDish();
      render(<DishDetail dish={dish} onAddToCart={handleAddToCart} />);

      fireEvent.click(screen.getByTestId('quantity-increase'));
      fireEvent.click(screen.getByTestId('quantity-increase'));
      fireEvent.click(screen.getByTestId('add-to-cart-detail'));

      expect(handleAddToCart).toHaveBeenCalledWith(dish, expect.objectContaining({ quantity: 3 }));
    });
  });

  describe('Back Button', () => {
    it('shows back button when onBack provided', () => {
      render(<DishDetail dish={createDish()} onBack={jest.fn()} />);
      expect(screen.getByTestId('back-button')).toBeInTheDocument();
    });

    it('does not show back button when onBack not provided', () => {
      render(<DishDetail dish={createDish()} />);
      expect(screen.queryByTestId('back-button')).not.toBeInTheDocument();
    });

    it('calls onBack when clicked', () => {
      const handleBack = jest.fn();
      render(<DishDetail dish={createDish()} onBack={handleBack} />);

      fireEvent.click(screen.getByTestId('back-button'));
      expect(handleBack).toHaveBeenCalledTimes(1);
    });
  });
});

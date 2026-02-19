import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { DishCard } from '../DishCard';
import { DishFactory } from '../../../test/factories/dish.factory';

describe('DishCard', () => {
  it('should render dish name and price', () => {
    const dish = DishFactory.build({ name: 'Margherita Pizza', price: 14.99 });
    render(<DishCard dish={dish} />);

    expect(screen.getByText('Margherita Pizza')).toBeInTheDocument();
    expect(screen.getByText('$14.99')).toBeInTheDocument();
  });

  it('should render dish description', () => {
    const dish = DishFactory.build({ description: 'Fresh mozzarella and basil' });
    render(<DishCard dish={dish} />);

    expect(screen.getByText('Fresh mozzarella and basil')).toBeInTheDocument();
  });

  it('should render dish category', () => {
    const dish = DishFactory.build({ category: 'Pizza' });
    render(<DishCard dish={dish} />);

    expect(screen.getByText('Pizza')).toBeInTheDocument();
  });

  it('should show availability toggle', () => {
    const dish = DishFactory.build({ isAvailable: true });
    render(<DishCard dish={dish} />);

    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByTestId('dish-availability-toggle')).toBeChecked();
  });

  it('should show unavailable state', () => {
    const dish = DishFactory.build({ isAvailable: false });
    render(<DishCard dish={dish} />);

    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    expect(screen.getByTestId('dish-availability-toggle')).not.toBeChecked();
  });

  it('should call onToggleAvailability when toggle is changed', () => {
    const onToggle = jest.fn();
    const dish = DishFactory.build({ isAvailable: true });
    render(<DishCard dish={dish} onToggleAvailability={onToggle} />);

    fireEvent.click(screen.getByTestId('dish-availability-toggle'));
    expect(onToggle).toHaveBeenCalledWith(dish.id, false);
  });

  it('should call onEdit when edit button is clicked', () => {
    const onEdit = jest.fn();
    const dish = DishFactory.build();
    render(<DishCard dish={dish} onEdit={onEdit} />);

    fireEvent.click(screen.getByTestId('dish-edit'));
    expect(onEdit).toHaveBeenCalledWith(dish.id);
  });

  it('should call onDelete when delete button is clicked', () => {
    const onDelete = jest.fn();
    const dish = DishFactory.build();
    render(<DishCard dish={dish} onDelete={onDelete} />);

    fireEvent.click(screen.getByTestId('dish-delete'));
    expect(onDelete).toHaveBeenCalledWith(dish.id);
  });

  it('should render dietary tags for vegetarian dishes', () => {
    const dish = DishFactory.build({
      dietary: {
        isVegetarian: true,
        isVegan: false,
        isGlutenFree: true,
        isDairyFree: false,
        isNutFree: false,
        isHalal: false,
        isKosher: false,
      },
    });
    render(<DishCard dish={dish} />);

    expect(screen.getByText('Veg')).toBeInTheDocument();
    expect(screen.getByText('GF')).toBeInTheDocument();
  });

  it('should render dish image when available', () => {
    const dish = DishFactory.build({ images: ['https://example.com/pizza.jpg'] });
    render(<DishCard dish={dish} />);

    const img = screen.getByAltText(dish.name);
    expect(img).toHaveAttribute('src', 'https://example.com/pizza.jpg');
  });

  it('should have reduced opacity when dish is unavailable', () => {
    const dish = DishFactory.build({ isAvailable: false });
    render(<DishCard dish={dish} />);

    const card = screen.getByTestId(`dish-card-${dish.id}`);
    expect(card).toHaveClass('opacity-60');
  });
});

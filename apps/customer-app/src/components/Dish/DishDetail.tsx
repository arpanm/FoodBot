import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Dish } from '../../types/models';

export interface DishDetailCustomizations {
  customizations: Record<string, string[]>;
  quantity: number;
}

export interface DishDetailProps {
  dish: Dish | null;
  onAddToCart?: (dish: Dish, customizations: DishDetailCustomizations) => void;
  onBack?: () => void;
  'data-testid'?: string;
}

/**
 * Detailed dish view with customizations
 */
export const DishDetail: React.FC<DishDetailProps> = ({
  dish,
  onAddToCart,
  onBack,
  'data-testid': testId,
}) => {
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, string[]>>({});
  const [quantity, setQuantity] = useState(1);

  if (!dish) {
    return <div data-testid="dish-detail-empty">No dish selected</div>;
  }

  const handleCustomizationChange = (customizationId: string, optionId: string, type: string) => {
    setSelectedCustomizations((prev) => {
      const current = prev[customizationId] || [];
      if (type === 'single') {
        return { ...prev, [customizationId]: [optionId] };
      }
      if (current.includes(optionId)) {
        return { ...prev, [customizationId]: current.filter((id) => id !== optionId) };
      }
      return { ...prev, [customizationId]: [...current, optionId] };
    });
  };

  const handleAddToCart = () => {
    onAddToCart?.(dish, { customizations: selectedCustomizations, quantity });
  };

  return (
    <div className="dish-detail" data-testid={testId || 'dish-detail'}>
      {onBack && (
        <button onClick={onBack} data-testid="back-button">
          Back
        </button>
      )}
      <Card variant="elevated">
        {dish.images?.[0] && (
          <img src={dish.images[0]} alt={dish.name} data-testid="detail-dish-image" />
        )}
        <h2 data-testid="detail-dish-name">{dish.name}</h2>
        <p data-testid="detail-dish-description">{dish.description}</p>
        <div data-testid="detail-dish-price">${dish.price.toFixed(2)}</div>

        {dish.nutritionalInfo && (
          <div className="nutritional-info" data-testid="nutritional-info">
            <h4>Nutritional Information</h4>
            <div>Calories: {dish.nutritionalInfo.calories}</div>
            <div>Protein: {dish.nutritionalInfo.protein}g</div>
            <div>Carbs: {dish.nutritionalInfo.carbohydrates}g</div>
            <div>Fat: {dish.nutritionalInfo.fat}g</div>
          </div>
        )}

        {dish.allergens?.length > 0 && (
          <div className="allergens" data-testid="allergen-info">
            <h4>Allergens</h4>
            {dish.allergens.map((allergen) => (
              <span key={allergen} className="allergen-tag">
                {allergen}
              </span>
            ))}
          </div>
        )}

        {dish.customizations?.map((customization) => (
          <div key={customization.id} className="customization" data-testid={`customization-${customization.id}`}>
            <h4>
              {customization.name}
              {customization.required && <span className="required">*</span>}
            </h4>
            {customization.options.map((option) => (
              <label key={option.id} className="customization-option">
                <input
                  type={customization.type === 'single' ? 'radio' : 'checkbox'}
                  name={customization.id}
                  checked={selectedCustomizations[customization.id]?.includes(option.id) || false}
                  onChange={() => handleCustomizationChange(customization.id, option.id, customization.type)}
                  data-testid={`option-${option.id}`}
                />
                {option.name}
                {option.priceModifier !== 0 && (
                  <span>
                    {option.priceModifier > 0 ? '+' : ''}${option.priceModifier.toFixed(2)}
                  </span>
                )}
              </label>
            ))}
          </div>
        ))}

        <div className="quantity-control" data-testid="quantity-control">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            data-testid="quantity-decrease"
          >
            -
          </button>
          <span data-testid="quantity-value">{quantity}</span>
          <button
            onClick={() => setQuantity(quantity + 1)}
            data-testid="quantity-increase"
          >
            +
          </button>
        </div>

        {onAddToCart && (
          <Button onClick={handleAddToCart} data-testid="add-to-cart-detail">
            Add to Cart - ${(dish.price * quantity).toFixed(2)}
          </Button>
        )}
      </Card>
    </div>
  );
};

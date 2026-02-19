/**
 * Maps Internal database entities to FoodBot provider models.
 * Minimal mapping since internal data IS the canonical format.
 */

import type { GeoLocation, PriceRange, OperatingHours } from '../../types/common.types.js';
import type { Restaurant, Dish, Menu, MenuCategory, AvailabilityStatus } from '../../types/provider.types.js';

export interface InternalRestaurantEntity {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  address: string;
  locality: string;
  city: string;
  latitude: number;
  longitude: number;
  cuisines: string[];
  rating: number;
  reviewCount: number;
  deliveryTimeMinutes: number;
  priceRange: number;
  isActive: boolean;
  isOpen: boolean;
  operatingHours: OperatingHours | null;
  createdAt: string;
  updatedAt: string;
}

export interface InternalDishEntity {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  isVegetarian: boolean;
  isAvailable: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function mapInternalRestaurant(
  entity: InternalRestaurantEntity,
  userLocation?: GeoLocation
): Restaurant {
  const restaurantLocation: GeoLocation = {
    lat: entity.latitude,
    lng: entity.longitude,
  };

  return {
    id: `internal-${entity.id}`,
    externalId: entity.id,
    provider: 'internal',
    name: entity.name,
    imageUrl: entity.imageUrl ?? '',
    address: [entity.address, entity.locality, entity.city]
      .filter(Boolean)
      .join(', '),
    cuisines: entity.cuisines ?? [],
    rating: entity.rating ?? 0,
    reviewCount: entity.reviewCount ?? 0,
    deliveryTimeMinutes: entity.deliveryTimeMinutes ?? 0,
    distanceKm: userLocation
      ? calculateDistance(userLocation, restaurantLocation)
      : 0,
    priceRange: clampPriceRange(entity.priceRange),
    isOpen: entity.isOpen ?? false,
    isAvailable: (entity.isActive ?? false) && (entity.isOpen ?? false),
    offers: [],
    operatingHours: entity.operatingHours,
    location: restaurantLocation,
  };
}

export function mapInternalDish(entity: InternalDishEntity): Dish {
  return {
    id: `internal-dish-${entity.id}`,
    externalId: entity.id,
    provider: 'internal',
    restaurantId: `internal-${entity.restaurantId}`,
    name: entity.name,
    description: entity.description ?? '',
    category: entity.category ?? 'Uncategorized',
    imageUrl: entity.imageUrl ?? '',
    price: entity.price ?? 0,
    originalPrice: entity.originalPrice ?? entity.price ?? 0,
    currency: 'INR',
    rating: entity.rating ?? 0,
    reviewCount: entity.reviewCount ?? 0,
    isVegetarian: entity.isVegetarian ?? false,
    isAvailable: entity.isAvailable ?? true,
    customizations: [],
    nutritionalInfo: null,
  };
}

export function mapInternalMenu(
  dishes: InternalDishEntity[],
  restaurantId: string,
  restaurantName: string
): Menu {
  const categoryMap = new Map<string, InternalDishEntity[]>();

  for (const dish of dishes) {
    const cat = dish.category || 'Uncategorized';
    const existing = categoryMap.get(cat) ?? [];
    existing.push(dish);
    categoryMap.set(cat, existing);
  }

  const categories: MenuCategory[] = [];
  let sortOrder = 0;

  for (const [name, categoryDishes] of categoryMap) {
    categories.push({
      id: `internal-cat-${sortOrder}`,
      name,
      description: '',
      sortOrder,
      dishes: categoryDishes.map(mapInternalDish),
    });
    sortOrder++;
  }

  return {
    restaurantId: `internal-${restaurantId}`,
    restaurantName,
    categories,
    lastUpdated: new Date().toISOString(),
  };
}

export function mapInternalAvailability(
  entity: InternalRestaurantEntity
): AvailabilityStatus {
  return {
    restaurantId: `internal-${entity.id}`,
    isOpen: entity.isOpen,
    isAcceptingOrders: entity.isActive && entity.isOpen,
    estimatedDeliveryMinutes: entity.deliveryTimeMinutes,
    nextOpenTime: null,
    message: entity.isOpen
      ? `Delivering in ${entity.deliveryTimeMinutes} min`
      : 'Currently closed',
  };
}

function clampPriceRange(value: number): PriceRange {
  if (value >= 1 && value <= 4) {
    return value as PriceRange;
  }
  return 2;
}

function calculateDistance(from: GeoLocation, to: GeoLocation): number {
  const R = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) *
      Math.cos(toRad(to.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

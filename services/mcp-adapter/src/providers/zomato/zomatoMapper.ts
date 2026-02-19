/**
 * Maps Zomato-specific data formats to FoodBot internal models.
 */

import type { PriceRange, OfferInfo, GeoLocation } from '../../types/common.types.js';
import type { Restaurant, Dish, Menu, MenuCategory, Review, AvailabilityStatus } from '../../types/provider.types.js';
import type {
  ZomatoRestaurantInfo,
  ZomatoDishInfo,
  ZomatoMenuSection,
  ZomatoReview,
} from '../../types/zomato.types.js';

export function mapZomatoRestaurant(
  info: ZomatoRestaurantInfo,
  userLocation?: GeoLocation
): Restaurant {
  const lat = parseFloat(info.location?.latitude ?? '0');
  const lng = parseFloat(info.location?.longitude ?? '0');

  return {
    id: `zomato-${info.id}`,
    externalId: info.id,
    provider: 'zomato',
    name: info.name,
    imageUrl: info.featured_image || info.thumb || '',
    address: info.location?.address ?? '',
    cuisines: parseCuisineString(info.cuisines),
    rating: parseFloat(info.user_rating?.aggregate_rating ?? '0'),
    reviewCount: parseInt(info.user_rating?.votes ?? '0', 10) || 0,
    deliveryTimeMinutes: parseDeliveryTime(info.delivery_time),
    distanceKm: userLocation
      ? calculateDistance(userLocation, { lat, lng })
      : 0,
    priceRange: mapPriceRange(info.price_range),
    isOpen: info.is_delivering_now === 1,
    isAvailable: info.has_online_delivery === 1 && info.is_delivering_now === 1,
    offers: parseOffers(info.offers),
    operatingHours: null,
    location: { lat, lng },
  };
}

export function mapZomatoDish(
  info: ZomatoDishInfo,
  restaurantId: string
): Dish {
  return {
    id: `zomato-dish-${info.dish_id}`,
    externalId: info.dish_id,
    provider: 'zomato',
    restaurantId: `zomato-${restaurantId}`,
    name: info.name,
    description: info.description ?? '',
    category: info.category ?? 'Uncategorized',
    imageUrl: info.image_url ?? '',
    price: info.price ?? 0,
    originalPrice: info.price ?? 0,
    currency: 'INR',
    rating: info.rating ?? 0,
    reviewCount: info.votes ?? 0,
    isVegetarian: info.is_veg ?? false,
    isAvailable: info.available ?? false,
    customizations: (info.variants ?? []).map((v) => ({
      id: v.variant_id,
      name: 'Size',
      required: false,
      minSelection: 0,
      maxSelection: 1,
      options: [
        {
          id: v.variant_id,
          name: v.name,
          price: v.price,
          isDefault: v.is_default,
          isVegetarian: info.is_veg,
        },
      ],
    })),
    nutritionalInfo: null,
  };
}

export function mapZomatoMenuSections(
  sections: ZomatoMenuSection[],
  restaurantId: string
): MenuCategory[] {
  return sections.map((section, index) => ({
    id: section.id || `zomato-cat-${index}`,
    name: section.name,
    description: '',
    sortOrder: index,
    dishes: (section.items ?? []).map((item) =>
      mapZomatoDish(item, restaurantId)
    ),
  }));
}

export function mapZomatoMenu(
  sections: ZomatoMenuSection[],
  restaurantId: string,
  restaurantName: string
): Menu {
  return {
    restaurantId: `zomato-${restaurantId}`,
    restaurantName,
    categories: mapZomatoMenuSections(sections, restaurantId),
    lastUpdated: new Date().toISOString(),
  };
}

export function mapZomatoReview(review: ZomatoReview): Review {
  const r = review.review;
  return {
    id: String(r.id),
    userId: '',
    userName: r.user?.name ?? 'Anonymous',
    rating: r.rating,
    text: r.review_text ?? '',
    date: r.review_time_friendly ?? '',
    helpful: r.likes ?? 0,
  };
}

export function mapZomatoAvailability(
  info: ZomatoRestaurantInfo
): AvailabilityStatus {
  return {
    restaurantId: `zomato-${info.id}`,
    isOpen: info.is_delivering_now === 1,
    isAcceptingOrders: info.has_online_delivery === 1 && info.is_delivering_now === 1,
    estimatedDeliveryMinutes: parseDeliveryTime(info.delivery_time),
    nextOpenTime: null,
    message: info.is_delivering_now === 1
      ? `Delivering in ${info.delivery_time || '?'}`
      : 'Currently not delivering',
  };
}

function parseCuisineString(cuisines: string): string[] {
  if (!cuisines) {
    return [];
  }
  return cuisines
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);
}

function parseDeliveryTime(deliveryTime: string): number {
  if (!deliveryTime) {
    return 0;
  }
  const match = deliveryTime.match(/(\d+)/);
  return match?.[1] ? parseInt(match[1], 10) : 0;
}

function mapPriceRange(priceRange: number): PriceRange {
  if (priceRange >= 1 && priceRange <= 4) {
    return priceRange as PriceRange;
  }
  return 2;
}

function parseOffers(offers: string[]): OfferInfo[] {
  if (!offers?.length) {
    return [];
  }
  return offers.map((offer, index) => ({
    id: `zomato-offer-${index}`,
    title: offer,
    description: '',
    discountPercent: 0,
    maxDiscount: 0,
    minOrderValue: 0,
    validUntil: '',
    code: '',
  }));
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

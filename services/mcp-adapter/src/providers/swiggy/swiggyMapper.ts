/**
 * Maps Swiggy-specific data formats to FoodBot internal models.
 */

import type { GeoLocation, PriceRange, OfferInfo, Customization } from '../../types/common.types.js';
import type { Restaurant, Dish, Menu, MenuCategory, AvailabilityStatus } from '../../types/provider.types.js';
import type {
  SwiggyRestaurantInfo,
  SwiggyDishInfo,
  SwiggyMenuCategory,
  SwiggyAddonGroup,
} from '../../types/swiggy.types.js';

const SWIGGY_IMAGE_BASE =
  'https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_508,h_320,c_fill/';

export function mapSwiggyRestaurant(
  info: SwiggyRestaurantInfo,
  userLocation?: GeoLocation
): Restaurant {
  return {
    id: `swiggy-${info.id}`,
    externalId: info.id,
    provider: 'swiggy',
    name: info.name,
    imageUrl: info.cloudinaryImageId
      ? `${SWIGGY_IMAGE_BASE}${info.cloudinaryImageId}`
      : '',
    address: [info.locality, info.areaName].filter(Boolean).join(', '),
    cuisines: info.cuisines ?? [],
    rating: info.avgRating ?? 0,
    reviewCount: parseReviewCount(info.totalRatingsString),
    deliveryTimeMinutes: info.sla?.deliveryTime ?? 0,
    distanceKm: info.sla?.lastMileTravel ?? 0,
    priceRange: parsePriceRange(info.costForTwo),
    isOpen: info.isOpen ?? false,
    isAvailable: info.isOpen && info.sla?.serviceability === 'SERVICEABLE',
    offers: parseOffers(info.aggregatedDiscountInfoV3),
    operatingHours: null,
    location: userLocation ?? { lat: 0, lng: 0 },
  };
}

export function mapSwiggyDish(
  info: SwiggyDishInfo,
  restaurantId: string
): Dish {
  const ratingStr = info.ratings?.aggregatedRating?.rating ?? '0';
  const ratingCountStr = info.ratings?.aggregatedRating?.ratingCount ?? '0';

  return {
    id: `swiggy-dish-${info.id}`,
    externalId: info.id,
    provider: 'swiggy',
    restaurantId: `swiggy-${restaurantId}`,
    name: info.name,
    description: info.description ?? '',
    category: info.category ?? 'Uncategorized',
    imageUrl: info.imageId ? `${SWIGGY_IMAGE_BASE}${info.imageId}` : '',
    price: (info.price ?? info.defaultPrice ?? 0) / 100,
    originalPrice: (info.defaultPrice ?? info.price ?? 0) / 100,
    currency: 'INR',
    rating: parseFloat(ratingStr) || 0,
    reviewCount: parseReviewCount(ratingCountStr),
    isVegetarian: info.isVeg === 1,
    isAvailable: info.inStock === 1,
    customizations: mapAddonGroups(info.addons ?? []),
    nutritionalInfo: null,
  };
}

export function mapSwiggyMenuCategories(
  categories: SwiggyMenuCategory[],
  restaurantId: string
): MenuCategory[] {
  return categories.map((cat, index) => ({
    id: `swiggy-cat-${index}`,
    name: cat.title,
    description: '',
    sortOrder: index,
    dishes: (cat.itemCards ?? []).map((item) =>
      mapSwiggyDish(item.card.info, restaurantId)
    ),
  }));
}

export function mapSwiggyMenu(
  categories: SwiggyMenuCategory[],
  restaurantId: string,
  restaurantName: string
): Menu {
  return {
    restaurantId: `swiggy-${restaurantId}`,
    restaurantName,
    categories: mapSwiggyMenuCategories(categories, restaurantId),
    lastUpdated: new Date().toISOString(),
  };
}

export function mapSwiggyAvailability(
  info: SwiggyRestaurantInfo
): AvailabilityStatus {
  return {
    restaurantId: `swiggy-${info.id}`,
    isOpen: info.isOpen,
    isAcceptingOrders: info.isOpen && info.sla?.serviceability === 'SERVICEABLE',
    estimatedDeliveryMinutes: info.sla?.deliveryTime ?? 0,
    nextOpenTime: info.availability?.nextCloseTime ?? null,
    message: info.isOpen
      ? `Delivering in ${info.sla?.deliveryTime ?? '?'} min`
      : 'Currently closed',
  };
}

function parseReviewCount(ratingString: string): number {
  if (!ratingString) {
    return 0;
  }
  const cleaned = ratingString.replace(/[^0-9.KkMm+]/g, '');
  if (cleaned.toLowerCase().includes('k')) {
    return Math.round(parseFloat(cleaned) * 1000);
  }
  if (cleaned.toLowerCase().includes('m')) {
    return Math.round(parseFloat(cleaned) * 1_000_000);
  }
  return parseInt(cleaned, 10) || 0;
}

function parsePriceRange(costForTwo: string): PriceRange {
  if (!costForTwo) {
    return 2;
  }
  const match = costForTwo.match(/(\d+)/);
  if (!match?.[1]) {
    return 2;
  }
  const cost = parseInt(match[1], 10);
  if (cost <= 200) {
    return 1;
  }
  if (cost <= 400) {
    return 2;
  }
  if (cost <= 800) {
    return 3;
  }
  return 4;
}

function parseOffers(
  discountInfo?: { header: string; subHeader: string; discountTag?: string }
): OfferInfo[] {
  if (!discountInfo?.header) {
    return [];
  }
  return [
    {
      id: `swiggy-offer-${Date.now()}`,
      title: discountInfo.header,
      description: discountInfo.subHeader ?? '',
      discountPercent: extractDiscountPercent(discountInfo.header),
      maxDiscount: extractMaxDiscount(discountInfo.subHeader ?? ''),
      minOrderValue: 0,
      validUntil: '',
      code: discountInfo.discountTag ?? '',
    },
  ];
}

function extractDiscountPercent(header: string): number {
  const match = header.match(/(\d+)%/);
  return match?.[1] ? parseInt(match[1], 10) : 0;
}

function extractMaxDiscount(subHeader: string): number {
  const match = subHeader.match(/(\d+)/);
  return match?.[1] ? parseInt(match[1], 10) : 0;
}

function mapAddonGroups(groups: SwiggyAddonGroup[]): Customization[] {
  return groups.map((group) => ({
    id: group.groupId,
    name: group.groupName,
    required: group.minAddons > 0,
    minSelection: group.minAddons,
    maxSelection: group.maxAddons,
    options: (group.choices ?? []).map((choice) => ({
      id: choice.id,
      name: choice.name,
      price: (choice.price ?? 0) / 100,
      isDefault: false,
      isVegetarian: choice.isVeg === 1,
    })),
  }));
}

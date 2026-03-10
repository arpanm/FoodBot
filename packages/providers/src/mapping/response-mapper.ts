import type {
  InternalOrder,
  ProviderName,
  ProviderOrder,
  ProviderRestaurant,
} from '../types/provider.types.js';

export interface SwiggyRawRestaurant {
  restaurant_id: string;
  restaurant_name: string;
  cuisine_types: string[];
  avg_rating: number;
  delivery_eta_minutes: number;
  min_order_value: number;
  is_open: boolean;
  lat: number;
  lng: number;
}

export interface ZomatoRawRestaurant {
  res_id: string;
  name: string;
  cuisines: string;
  user_rating: { aggregate_rating: number };
  delivery_time: { estimated: number };
  minimum_order: number;
  is_delivering: boolean;
  location: { latitude: number; longitude: number };
}

export interface OndcCatalogItem {
  provider_id: string;
  provider_name: string;
  categories: string[];
  rating_value: number;
  fulfillment_time: number;
  min_order_amount: number;
  store_open: boolean;
  gps: string;
}

export function mapSwiggyRestaurant(raw: SwiggyRawRestaurant): ProviderRestaurant {
  return {
    id: raw.restaurant_id,
    name: raw.restaurant_name,
    cuisine: raw.cuisine_types,
    rating: raw.avg_rating,
    deliveryTime: raw.delivery_eta_minutes,
    minimumOrder: raw.min_order_value,
    isOpen: raw.is_open,
    location: {
      latitude: raw.lat,
      longitude: raw.lng,
    },
  };
}

export function mapZomatoRestaurant(raw: ZomatoRawRestaurant): ProviderRestaurant {
  return {
    id: raw.res_id,
    name: raw.name,
    cuisine: raw.cuisines.split(',').map((c) => c.trim()),
    rating: raw.user_rating.aggregate_rating,
    deliveryTime: raw.delivery_time.estimated,
    minimumOrder: raw.minimum_order,
    isOpen: raw.is_delivering,
    location: {
      latitude: raw.location.latitude,
      longitude: raw.location.longitude,
    },
  };
}

export function mapOndcCatalog(raw: OndcCatalogItem): ProviderRestaurant {
  const [latStr, lngStr] = raw.gps.split(',');
  const latitude = parseFloat(latStr ?? '0');
  const longitude = parseFloat(lngStr ?? '0');

  return {
    id: raw.provider_id,
    name: raw.provider_name,
    cuisine: raw.categories,
    rating: raw.rating_value,
    deliveryTime: raw.fulfillment_time,
    minimumOrder: raw.min_order_amount,
    isOpen: raw.store_open,
    location: { latitude, longitude },
  };
}

export function mapToInternalOrder(
  providerOrder: ProviderOrder,
  providerName: ProviderName
): InternalOrder {
  return {
    ...providerOrder,
    providerName,
    createdAt: Date.now(),
  };
}

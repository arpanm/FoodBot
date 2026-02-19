/**
 * Zomato-specific data types.
 * These represent the raw response formats from Zomato's APIs.
 */

// ============================================
// Legacy API v2.1 Types
// ============================================

export interface ZomatoSearchResponse {
  results_found: number;
  results_start: number;
  results_shown: number;
  restaurants: ZomatoRestaurantWrapper[];
}

export interface ZomatoRestaurantWrapper {
  restaurant: ZomatoRestaurantInfo;
}

export interface ZomatoRestaurantInfo {
  R: { res_id: number; is_grocery_store: boolean };
  id: string;
  name: string;
  url: string;
  location: ZomatoLocation;
  switch_to_order_menu: number;
  cuisines: string;
  timings: string;
  average_cost_for_two: number;
  price_range: number;
  currency: string;
  highlights: string[];
  offers: string[];
  opentable_support: number;
  is_zomato_book_res: number;
  mezzo_provider: string;
  is_book_form_web_view: number;
  book_form_web_view_url: string;
  book_again_url: string;
  thumb: string;
  user_rating: ZomatoUserRating;
  all_reviews_count: number;
  photos_url: string;
  photo_count: number;
  menu_url: string;
  featured_image: string;
  has_online_delivery: number;
  is_delivering_now: number;
  store_type: string;
  include_bogo_offers: boolean;
  deeplink: string;
  is_table_reservation_supported: number;
  has_table_booking: number;
  events_url: string;
  phone_numbers: string;
  all_reviews: ZomatoReviewInfo;
  establishment: string[];
  establishment_types: number[];
  delivery_time: string;
}

export interface ZomatoLocation {
  address: string;
  locality: string;
  city: string;
  city_id: number;
  latitude: string;
  longitude: string;
  zipcode: string;
  country_id: number;
  locality_verbose: string;
}

export interface ZomatoUserRating {
  aggregate_rating: string;
  rating_text: string;
  rating_color: string;
  rating_obj: {
    title: { text: string };
    bg_color: { type: string; tint: string };
  };
  votes: string;
}

export interface ZomatoReviewInfo {
  reviews: ZomatoReview[];
}

export interface ZomatoReview {
  review: {
    rating: number;
    review_text: string;
    id: number;
    rating_color: string;
    review_time_friendly: string;
    rating_text: string;
    timestamp: number;
    likes: number;
    user: {
      name: string;
      foodie_level: string;
      foodie_level_num: number;
      foodie_color: string;
      profile_url: string;
      profile_image: string;
    };
    comments_count: number;
  };
}

export interface ZomatoReviewsResponse {
  reviews_count: number;
  reviews_start: number;
  reviews_shown: number;
  user_reviews: ZomatoReview[];
}

export interface ZomatoCollectionsResponse {
  collections: ZomatoCollection[];
  has_more: number;
  share_url: string;
  display_text: string;
  has_total: number;
}

export interface ZomatoCollection {
  collection: {
    collection_id: number;
    res_count: number;
    image_url: string;
    url: string;
    title: string;
    description: string;
    share_url: string;
  };
}

export interface ZomatoCuisinesResponse {
  cuisines: ZomatoCuisine[];
}

export interface ZomatoCuisine {
  cuisine: {
    cuisine_id: number;
    cuisine_name: string;
  };
}

// ============================================
// Internal API (Session-based) Types
// ============================================

export interface ZomatoMenuResponse {
  pages: ZomatoMenuPage[];
  restaurant: {
    id: string;
    name: string;
    is_delivering_now: boolean;
  };
}

export interface ZomatoMenuPage {
  pageType: string;
  order: ZomatoOrderMenu;
}

export interface ZomatoOrderMenu {
  menuList: ZomatoMenuSection[];
}

export interface ZomatoMenuSection {
  id: string;
  name: string;
  items: ZomatoDishInfo[];
}

export interface ZomatoDishInfo {
  dish_id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  is_veg: boolean;
  image_url: string;
  rating: number;
  votes: number;
  variants: ZomatoVariant[];
  addons: ZomatoAddon[];
  available: boolean;
  min_order_quantity: number;
  max_order_quantity: number;
}

export interface ZomatoVariant {
  variant_id: string;
  name: string;
  price: number;
  is_default: boolean;
  is_available: boolean;
}

export interface ZomatoAddon {
  addon_id: string;
  name: string;
  price: number;
  is_veg: boolean;
  is_available: boolean;
  category: string;
}

export interface ZomatoCartResponse {
  cart_id: string;
  items: ZomatoCartItem[];
  subtotal: number;
  delivery_fee: number;
  taxes: number;
  total: number;
  currency: string;
  restaurant_id: string;
}

export interface ZomatoCartItem {
  item_id: string;
  dish_id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  variants: string[];
  addons: string[];
}

export interface ZomatoOrderResponse {
  order_id: string;
  status: string;
  estimated_delivery: string;
  total: number;
  currency: string;
  tracking_url: string;
}

export interface ZomatoSessionConfig {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface ZomatoApiKeyConfig {
  apiKey: string;
  dailyLimit: number;
  usedToday: number;
}

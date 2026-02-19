/**
 * Swiggy-specific data types.
 * These represent the raw response formats from Swiggy's internal APIs.
 */

export interface SwiggyRestaurantListResponse {
  statusCode: number;
  data: {
    cards: SwiggyCard[];
    pageOffset: {
      nextOffset: string;
      widgetOffset: Record<string, string>;
    };
  };
}

export interface SwiggyCard {
  card: {
    card: {
      '@type': string;
      id: string;
      gridElements?: {
        infoWithStyle: {
          restaurants: SwiggyRestaurantWrapper[];
        };
      };
    };
  };
}

export interface SwiggyRestaurantWrapper {
  info: SwiggyRestaurantInfo;
  cta?: {
    link: string;
    type: string;
  };
}

export interface SwiggyRestaurantInfo {
  id: string;
  name: string;
  cloudinaryImageId: string;
  locality: string;
  areaName: string;
  costForTwo: string;
  cuisines: string[];
  avgRating: number;
  totalRatingsString: string;
  sla: SwiggySlA;
  isOpen: boolean;
  availability: {
    nextCloseTime: string;
    opened: boolean;
  };
  aggregatedDiscountInfoV3?: {
    header: string;
    subHeader: string;
    discountTag?: string;
  };
  badges?: Record<string, unknown>;
  veg?: boolean;
  feeDetails?: {
    restaurantId: string;
    fees: SwiggyFee[];
    totalFee: number;
  };
}

export interface SwiggySlA {
  deliveryTime: number;
  lastMileTravel: number;
  serviceability: string;
  slaString: string;
  lastMileTravelString: string;
  iconType: string;
}

export interface SwiggyFee {
  name: string;
  fee: number;
}

export interface SwiggyMenuResponse {
  statusCode: number;
  data: {
    cards: SwiggyMenuCard[];
  };
}

export interface SwiggyMenuCard {
  card: {
    card: {
      '@type': string;
      title?: string;
      categories?: SwiggyMenuCategory[];
      itemCards?: SwiggyItemCard[];
    };
  };
}

export interface SwiggyMenuCategory {
  title: string;
  itemCards: SwiggyItemCard[];
}

export interface SwiggyItemCard {
  card: {
    '@type': string;
    info: SwiggyDishInfo;
  };
}

export interface SwiggyDishInfo {
  id: string;
  name: string;
  category: string;
  description: string;
  imageId: string;
  inStock: number;
  price: number;
  defaultPrice: number;
  ratings: {
    aggregatedRating: {
      rating: string;
      ratingCount: string;
      ratingCountV2: string;
    };
  };
  isVeg: number;
  addons?: SwiggyAddonGroup[];
  itemAttribute?: {
    vegClassifier: string;
    portionSize: string;
  };
  ribbon?: {
    text: string;
    textColor: string;
    topBackgroundColor: string;
    bottomBackgroundColor: string;
  };
}

export interface SwiggyAddonGroup {
  groupId: string;
  groupName: string;
  choices: SwiggyAddonChoice[];
  maxAddons: number;
  maxFreeAddons: number;
  minAddons: number;
}

export interface SwiggyAddonChoice {
  id: string;
  name: string;
  price: number;
  inStock: number;
  isVeg: number;
  isEnabled: number;
}

export interface SwiggySearchResponse {
  statusCode: number;
  data: {
    suggestions: SwiggySuggestion[];
    restaurants: SwiggyRestaurantWrapper[];
    dishes: SwiggyDishSearchResult[];
  };
}

export interface SwiggySuggestion {
  text: string;
  type: string;
  tagType: string;
  cloudinaryId: string;
}

export interface SwiggyDishSearchResult {
  card: {
    card: {
      restaurant: {
        info: SwiggyRestaurantInfo;
      };
      info: SwiggyDishInfo;
    };
  };
}

export interface SwiggySessionConfig {
  sessionToken: string;
  deviceId: string;
  lat: number;
  lng: number;
}

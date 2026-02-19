/**
 * Domain Models
 * Core entity types used throughout the application
 */

// ==================== User Models ====================

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  preferences: UserPreferences;
  addresses: Address[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  dietaryRestrictions?: string[];
  cuisinePreferences?: string[];
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  language?: string;
  theme?: 'light' | 'dark' | 'system';
}

export interface Address {
  id: string;
  type: 'home' | 'work' | 'other';
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  isDefault: boolean;
}

// ==================== Restaurant Models ====================

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine: string[];
  logo: string;
  images: string[];
  rating: number;
  reviewCount: number;
  priceRange: number;
  deliveryTime: string;
  deliveryFee: number;
  minimumOrder: number;
  isOpen: boolean;
  location: Location;
  dishes: string[];
  tags: string[];
  hours?: OperatingHours;
  contactInfo?: ContactInfo;
}

export interface Location {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  open: string;
  close: string;
  isClosed: boolean;
}

export interface ContactInfo {
  phone: string;
  email?: string;
  website?: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  images?: string[];
  createdAt: Date;
  helpful: number;
}

// ==================== Dish Models ====================

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  restaurantId: string;
  restaurantName: string;
  isAvailable: boolean;
  rating: number;
  reviewCount: number;
  tags: string[];
  dietary: DietaryInfo;
  ingredients: string[];
  allergens: string[];
  customizations: Customization[];
  nutritionalInfo: NutritionalInfo;
  preparationTime?: string;
  spiceLevel?: number;
}

export interface DietaryInfo {
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isNutFree: boolean;
  isHalal: boolean;
  isKosher: boolean;
}

export interface Customization {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  options: CustomizationOption[];
}

export interface CustomizationOption {
  id: string;
  name: string;
  priceModifier: number;
  isDefault?: boolean;
}

export interface NutritionalInfo {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber?: number;
  sodium?: number;
  sugar?: number;
}

// ==================== Cart Models ====================

export interface CartItem {
  id: string;
  dishId: string;
  dishName: string;
  dishImage?: string;
  quantity: number;
  price: number;
  customizations: SelectedCustomization[];
  specialInstructions?: string;
  subtotal: number;
}

export interface SelectedCustomization {
  customizationId: string;
  customizationName: string;
  optionId: string;
  optionName: string;
  priceModifier: number;
}

export interface Cart {
  items: CartItem[];
  restaurantId?: string;
  restaurantName?: string;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
}

// ==================== Order Models ====================

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED';

export type PaymentMethod = 'CREDIT_CARD' | 'DEBIT_CARD' | 'UPI' | 'WALLET' | 'COD';

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  restaurantLogo?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryAddress: Address;
  estimatedDeliveryTime: string;
  actualDeliveryTime?: string;
  placedAt: Date;
  confirmedAt?: Date;
  deliveredAt?: Date;
  trackingInfo?: TrackingInfo;
  contactInfo?: {
    phone: string;
    alternatePhone?: string;
  };
}

export interface OrderItem {
  dishId: string;
  dishName: string;
  dishImage?: string;
  quantity: number;
  price: number;
  customizations: SelectedCustomization[];
  specialInstructions?: string;
  subtotal: number;
}

export interface TrackingInfo {
  currentStatus: OrderStatus;
  statusHistory: TrackingStatus[];
  estimatedDeliveryTime: string;
  deliveryPersonInfo?: DeliveryPersonInfo;
  liveLocation?: {
    latitude: number;
    longitude: number;
    lastUpdated: Date;
  };
}

export interface TrackingStatus {
  status: OrderStatus;
  timestamp: Date;
  message?: string;
}

export interface DeliveryPersonInfo {
  name: string;
  phone: string;
  photo?: string;
  vehicleInfo?: {
    type: string;
    number: string;
  };
}

// ==================== Chat Models ====================

export type MessageSender = 'user' | 'bot';
export type MessageType = 'text' | 'card' | 'form' | 'status' | 'error';

export interface Message {
  id: string;
  sender: MessageSender;
  content: string;
  timestamp: Date;
  type: MessageType;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  cards?: MessageCard[];
  buttons?: MessageButton[];
  form?: MessageForm;
  error?: ErrorDetails;
  intent?: string;
  confidence?: number;
}

export interface MessageCard {
  id: string;
  type: 'restaurant' | 'dish' | 'order' | 'generic';
  title: string;
  description?: string;
  image?: string;
  price?: number;
  rating?: number;
  actions?: MessageButton[];
  data?: Record<string, unknown>;
}

export interface MessageButton {
  id: string;
  label: string;
  variant: 'primary' | 'secondary' | 'outline' | 'text';
  action: ButtonAction;
}

export interface ButtonAction {
  type: 'navigate' | 'api' | 'submit' | 'callback';
  payload: Record<string, unknown>;
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

export interface MessageForm {
  id: string;
  fields: FormField[];
  submitLabel: string;
  submitAction: ButtonAction;
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'date' | 'time';
  required: boolean;
  placeholder?: string;
  options?: FormFieldOption[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface FormFieldOption {
  label: string;
  value: string | number;
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ==================== Job/Async Processing Models ====================

export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type JobAction =
  | 'search_restaurant'
  | 'search_dish'
  | 'get_restaurant_details'
  | 'get_menu'
  | 'place_order'
  | 'track_order'
  | 'get_order_history';

export type Platform = 'swiggy' | 'zomato' | 'mock';

export interface Job<T = unknown> {
  id: string;
  action: JobAction;
  platform: Platform;
  status: JobStatus;
  result?: T;
  error?: string;
  progress?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface CreateJobPayload {
  action: JobAction;
  platform: Platform;
  payload: Record<string, unknown>;
}

export interface SearchRestaurantJobResult {
  restaurants: Restaurant[];
  total: number;
}

export interface SearchDishJobResult {
  dishes: Dish[];
  total: number;
}

export interface RestaurantDetailsJobResult {
  restaurant: Restaurant;
  menu: Dish[];
}

// ==================== Filter & Search Models ====================

export interface RestaurantFilters {
  cuisine?: string[];
  priceRange?: number[];
  rating?: number;
  deliveryTime?: string;
  dietary?: string[];
  sortBy?: 'rating' | 'deliveryTime' | 'price' | 'distance';
  isOpen?: boolean;
}

export interface DishFilters {
  category?: string[];
  priceRange?: number[];
  dietary?: string[];
  spiceLevel?: number[];
  sortBy?: 'rating' | 'price' | 'name';
}

export interface SearchQuery {
  query: string;
  filters?: RestaurantFilters | DishFilters;
  page?: number;
  limit?: number;
}

// ==================== Pagination Models ====================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

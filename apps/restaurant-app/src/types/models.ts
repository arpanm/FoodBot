/**
 * Domain Models for the Restaurant Owner App
 * Core entity types used throughout the restaurant management dashboard
 */

// ==================== Auth Models ====================

export interface RestaurantOwner {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  role: 'restaurant_owner';
  restaurantId?: string;
  createdAt: string;
  updatedAt: string;
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
  isActive: boolean;
  isApproved: boolean;
  location: Location;
  hours?: OperatingHours;
  contactInfo?: ContactInfo;
  deliverySettings?: DeliverySettings;
  paymentAccountId?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
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

export interface DeliverySettings {
  deliveryRadius: number;
  deliveryFee: number;
  freeDeliveryMinimum?: number;
  estimatedDeliveryTime: string;
  acceptsDelivery: boolean;
  acceptsPickup: boolean;
}

// ==================== Dish Models ====================

export interface Dish {
  id: string;
  name: string;
  description: string;
  price: number;
  discountedPrice?: number;
  images: string[];
  category: string;
  restaurantId: string;
  isAvailable: boolean;
  rating: number;
  reviewCount: number;
  tags: string[];
  dietary: DietaryInfo;
  ingredients: string[];
  allergens: string[];
  customizations: Customization[];
  nutritionalInfo?: NutritionalInfo;
  preparationTime: number;
  spiceLevel?: number;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
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

export interface DishCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  dishCount: number;
  isActive: boolean;
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
  customerName: string;
  customerPhone?: string;
  restaurantId: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryAddress: DeliveryAddress;
  specialInstructions?: string;
  estimatedDeliveryTime: string;
  actualDeliveryTime?: string;
  placedAt: string;
  confirmedAt?: string;
  preparedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
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

export interface SelectedCustomization {
  customizationId: string;
  customizationName: string;
  optionId: string;
  optionName: string;
  priceModifier: number;
}

export interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

// ==================== Analytics Models ====================

export interface RevenueMetrics {
  totalRevenue: number;
  previousPeriodRevenue: number;
  changePercentage: number;
  periodLabel: string;
}

export interface OrderMetrics {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  averagePreparationTime: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface PopularDish {
  dishId: string;
  dishName: string;
  orderCount: number;
  revenue: number;
  rating: number;
}

export interface CustomerFeedback {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  orderId: string;
  createdAt: string;
}

export interface AnalyticsSummary {
  revenue: RevenueMetrics;
  orders: OrderMetrics;
  dailyRevenue: DailyRevenue[];
  popularDishes: PopularDish[];
  recentFeedback: CustomerFeedback[];
}

// ==================== Onboarding Models ====================

export type OnboardingStatus =
  | 'pending_verification'
  | 'pending_approval'
  | 'setting_up_payment'
  | 'completed'
  | 'rejected'
  | 'expired';

export interface OnboardingProgress {
  restaurantId: string;
  status: OnboardingStatus;
  completedSteps: string[];
  currentStep: string;
  rejectionReason?: string;
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

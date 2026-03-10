export interface OrderItem {
  dishId: string;
  dishName: string;
  category: string;
  quantity: number;
  price: number;
  cost: number;
}

export interface OrderRecord {
  id: string;
  restaurantId: string;
  customerId: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: 'completed' | 'cancelled' | 'pending';
  createdAt: Date;
  completedAt: Date | null;
  prepTimeMinutes: number | null;
  deliveryTimeMinutes: number | null;
}

export interface RevenueByDay {
  date: string;
  revenue: number;
}

export interface RevenueByDish {
  dishId: string;
  dishName: string;
  revenue: number;
  quantitySold: number;
}

export interface RevenueByCategory {
  category: string;
  revenue: number;
  quantitySold: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  averageOrderValue: number;
  revenueByDay: RevenueByDay[];
  revenueByDish: RevenueByDish[];
  revenueByCategory: RevenueByCategory[];
}

export interface PeakHour {
  hour: number;
  orderCount: number;
}

export interface OrderMetrics {
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averagePrepTime: number | null;
  averageDeliveryTime: number | null;
  peakHours: PeakHour[];
}

export interface TopCustomer {
  customerId: string;
  totalSpent: number;
  orderCount: number;
}

export interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  customerRetentionRate: number;
  topCustomers: TopCustomer[];
}

export interface DishPerformance {
  dishId: string;
  dishName: string;
  quantitySold: number;
  revenue: number;
}

export interface DishProfitability {
  dishId: string;
  dishName: string;
  revenue: number;
  cost: number;
  profit: number;
  profitMargin: number;
}

export interface DishCombination {
  dishes: string[];
  frequency: number;
}

export interface MenuMetrics {
  topSellingDishes: DishPerformance[];
  worstPerformingDishes: DishPerformance[];
  dishProfitability: DishProfitability[];
  frequentCombinations: DishCombination[];
}

export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface RevenueComparison {
  period1Revenue: number;
  period2Revenue: number;
  changeAmount: number;
  changePercentage: number;
}

export interface AnalyticsReport {
  restaurantId: string;
  dateRange: DateRange;
  generatedAt: Date;
  revenue: RevenueMetrics;
  orders: OrderMetrics;
  customers: CustomerMetrics;
  menu: MenuMetrics;
}

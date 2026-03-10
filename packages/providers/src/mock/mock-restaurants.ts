import type { Location, ProviderRestaurant } from '../types/provider.types.js';

function restaurant(
  id: string, name: string, cuisine: string[], rating: number,
  deliveryTime: number, minimumOrder: number, isOpen: boolean, location: Location
): ProviderRestaurant {
  return { id, name, cuisine, rating, deliveryTime, minimumOrder, isOpen, location };
}

export const SWIGGY_RESTAURANTS: ProviderRestaurant[] = [
  restaurant('swiggy-r-001', 'Biryani Blues', ['Biryani', 'Mughlai', 'North Indian'],
    4.3, 35, 150, true, { latitude: 12.9716, longitude: 77.5946 }),
  restaurant('swiggy-r-002', 'Pizza Paradise', ['Pizza', 'Italian', 'Fast Food'],
    4.1, 30, 200, true, { latitude: 12.9352, longitude: 77.6245 }),
  restaurant('swiggy-r-003', 'Dosa Factory', ['South Indian', 'Dosa', 'Idli'],
    4.5, 25, 100, true, { latitude: 12.9279, longitude: 77.6271 }),
  restaurant('swiggy-r-004', 'Dragon Wok', ['Chinese', 'Asian', 'Thai'],
    3.9, 40, 250, true, { latitude: 12.9698, longitude: 77.7500 }),
  restaurant('swiggy-r-005', 'Burger Barn', ['Burgers', 'American', 'Fast Food'],
    4.0, 20, 150, true, { latitude: 12.9150, longitude: 77.6100 }),
  restaurant('swiggy-r-006', 'Tandoor Nights', ['North Indian', 'Tandoor', 'Mughlai'],
    4.4, 45, 300, false, { latitude: 12.9784, longitude: 77.6408 }),
  restaurant('swiggy-r-007', 'Sushi Station', ['Japanese', 'Sushi', 'Asian'],
    4.6, 50, 500, true, { latitude: 12.9560, longitude: 77.6950 }),
  restaurant('swiggy-r-008', 'Chaat Corner', ['Street Food', 'Chaat', 'Snacks'],
    4.2, 15, 80, true, { latitude: 12.9400, longitude: 77.5800 }),
  restaurant('swiggy-r-009', 'Kerala Kitchen', ['Kerala', 'South Indian', 'Seafood'],
    4.3, 35, 200, true, { latitude: 12.9250, longitude: 77.6500 }),
  restaurant('swiggy-r-010', 'Cake Walk', ['Desserts', 'Bakery', 'Cakes'],
    4.7, 30, 250, true, { latitude: 12.9600, longitude: 77.5700 }),
];

export const ZOMATO_RESTAURANTS: ProviderRestaurant[] = [
  restaurant('zomato-r-001', 'Spice Garden', ['North Indian', 'Mughlai', 'Kebabs'],
    4.2, 30, 200, true, { latitude: 12.9716, longitude: 77.5946 }),
  restaurant('zomato-r-002', 'Pasta Palace', ['Italian', 'Pasta', 'Continental'],
    4.4, 35, 250, true, { latitude: 12.9352, longitude: 77.6245 }),
  restaurant('zomato-r-003', 'Idli House', ['South Indian', 'Idli', 'Vada'],
    4.6, 20, 80, true, { latitude: 12.9279, longitude: 77.6271 }),
  restaurant('zomato-r-004', 'Wok This Way', ['Chinese', 'Pan-Asian', 'Noodles'],
    4.0, 35, 200, true, { latitude: 12.9698, longitude: 77.7500 }),
  restaurant('zomato-r-005', 'Grill House', ['Grills', 'BBQ', 'American'],
    4.1, 40, 300, true, { latitude: 12.9150, longitude: 77.6100 }),
  restaurant('zomato-r-006', 'Royal Biryani', ['Biryani', 'Hyderabadi', 'Mughlai'],
    4.5, 40, 180, true, { latitude: 12.9784, longitude: 77.6408 }),
  restaurant('zomato-r-007', 'Taco Bell Express', ['Mexican', 'Tacos', 'Fast Food'],
    3.8, 25, 150, false, { latitude: 12.9560, longitude: 77.6950 }),
  restaurant('zomato-r-008', 'Paan-Asian', ['Pan-Asian', 'Thai', 'Vietnamese'],
    4.3, 45, 350, true, { latitude: 12.9400, longitude: 77.5800 }),
  restaurant('zomato-r-009', 'Dal Makhani House', ['Punjabi', 'North Indian', 'Vegetarian'],
    4.4, 30, 150, true, { latitude: 12.9250, longitude: 77.6500 }),
  restaurant('zomato-r-010', 'Ice Cream Dreams', ['Desserts', 'Ice Cream', 'Shakes'],
    4.8, 20, 100, true, { latitude: 12.9600, longitude: 77.5700 }),
];

export const ONDC_RESTAURANTS: ProviderRestaurant[] = [
  restaurant('ondc-r-001', 'Annapurna Meals', ['South Indian', 'Thali', 'Vegetarian'],
    4.1, 25, 100, true, { latitude: 12.9716, longitude: 77.5946 }),
  restaurant('ondc-r-002', 'Fresh Bites', ['Healthy', 'Salads', 'Bowls'],
    4.3, 30, 200, true, { latitude: 12.9352, longitude: 77.6245 }),
  restaurant('ondc-r-003', 'Roti Mahal', ['North Indian', 'Roti', 'Sabzi'],
    4.0, 35, 120, true, { latitude: 12.9279, longitude: 77.6271 }),
  restaurant('ondc-r-004', 'Chai Point', ['Beverages', 'Snacks', 'Tea'],
    4.2, 15, 50, true, { latitude: 12.9698, longitude: 77.7500 }),
  restaurant('ondc-r-005', 'Wrap It Up', ['Wraps', 'Rolls', 'Fast Food'],
    3.9, 20, 100, true, { latitude: 12.9150, longitude: 77.6100 }),
  restaurant('ondc-r-006', 'Noodle Bar', ['Chinese', 'Noodles', 'Momos'],
    4.1, 30, 150, false, { latitude: 12.9784, longitude: 77.6408 }),
  restaurant('ondc-r-007', 'Chettinad Express', ['Chettinad', 'South Indian', 'Non-Veg'],
    4.4, 40, 200, true, { latitude: 12.9560, longitude: 77.6950 }),
  restaurant('ondc-r-008', 'Juice Junction', ['Juices', 'Smoothies', 'Healthy'],
    4.5, 10, 80, true, { latitude: 12.9400, longitude: 77.5800 }),
  restaurant('ondc-r-009', 'Paratha Plaza', ['Parathas', 'North Indian', 'Breakfast'],
    4.2, 25, 100, true, { latitude: 12.9250, longitude: 77.6500 }),
  restaurant('ondc-r-010', 'Mithai Mandir', ['Sweets', 'Desserts', 'Indian'],
    4.6, 20, 150, true, { latitude: 12.9600, longitude: 77.5700 }),
];

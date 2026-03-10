import type { ProviderMenuItem } from '../types/provider.types.js';

export interface MenuCollection {
  [restaurantId: string]: ProviderMenuItem[];
}

export const SWIGGY_MENUS: MenuCollection = {
  'swiggy-r-001': [
    { id: 'sm-001', name: 'Chicken Biryani', price: 280, description: 'Fragrant basmati rice with tender chicken', category: 'Biryani', isVeg: false, isAvailable: true },
    { id: 'sm-002', name: 'Mutton Biryani', price: 350, description: 'Aromatic biryani with succulent mutton', category: 'Biryani', isVeg: false, isAvailable: true },
    { id: 'sm-003', name: 'Veg Biryani', price: 220, description: 'Mixed vegetable biryani', category: 'Biryani', isVeg: true, isAvailable: true },
    { id: 'sm-004', name: 'Raita', price: 60, description: 'Fresh yogurt with cucumber and mint', category: 'Sides', isVeg: true, isAvailable: true },
    { id: 'sm-005', name: 'Gulab Jamun', price: 80, description: 'Soft milk dumplings in sugar syrup', category: 'Desserts', isVeg: true, isAvailable: false },
  ],
  'swiggy-r-002': [
    { id: 'sm-006', name: 'Margherita Pizza', price: 299, description: 'Classic tomato and mozzarella', category: 'Pizza', isVeg: true, isAvailable: true },
    { id: 'sm-007', name: 'Pepperoni Pizza', price: 399, description: 'Loaded with pepperoni slices', category: 'Pizza', isVeg: false, isAvailable: true },
    { id: 'sm-008', name: 'Garlic Bread', price: 149, description: 'Crispy bread with garlic butter', category: 'Sides', isVeg: true, isAvailable: true },
    { id: 'sm-009', name: 'Pasta Alfredo', price: 249, description: 'Creamy white sauce pasta', category: 'Pasta', isVeg: true, isAvailable: true },
    { id: 'sm-010', name: 'Tiramisu', price: 199, description: 'Classic Italian coffee dessert', category: 'Desserts', isVeg: true, isAvailable: true },
  ],
  'swiggy-r-003': [
    { id: 'sm-011', name: 'Masala Dosa', price: 120, description: 'Crispy dosa with potato filling', category: 'Dosa', isVeg: true, isAvailable: true },
    { id: 'sm-012', name: 'Plain Dosa', price: 80, description: 'Traditional crispy dosa', category: 'Dosa', isVeg: true, isAvailable: true },
    { id: 'sm-013', name: 'Idli Sambar', price: 90, description: 'Steamed rice cakes with sambar', category: 'Breakfast', isVeg: true, isAvailable: true },
    { id: 'sm-014', name: 'Vada', price: 70, description: 'Crispy lentil fritters', category: 'Snacks', isVeg: true, isAvailable: true },
    { id: 'sm-015', name: 'Filter Coffee', price: 50, description: 'Traditional South Indian filter coffee', category: 'Beverages', isVeg: true, isAvailable: true },
  ],
};

export const ZOMATO_MENUS: MenuCollection = {
  'zomato-r-001': [
    { id: 'zm-001', name: 'Butter Chicken', price: 320, description: 'Creamy tomato-based chicken curry', category: 'Main Course', isVeg: false, isAvailable: true },
    { id: 'zm-002', name: 'Paneer Tikka', price: 260, description: 'Grilled cottage cheese with spices', category: 'Starters', isVeg: true, isAvailable: true },
    { id: 'zm-003', name: 'Dal Tadka', price: 180, description: 'Yellow lentils tempered with spices', category: 'Main Course', isVeg: true, isAvailable: true },
    { id: 'zm-004', name: 'Naan Basket', price: 120, description: 'Assorted freshly baked naan', category: 'Breads', isVeg: true, isAvailable: true },
    { id: 'zm-005', name: 'Seekh Kebab', price: 290, description: 'Minced meat kebabs from tandoor', category: 'Starters', isVeg: false, isAvailable: true },
  ],
  'zomato-r-002': [
    { id: 'zm-006', name: 'Penne Arrabbiata', price: 310, description: 'Spicy tomato sauce pasta', category: 'Pasta', isVeg: true, isAvailable: true },
    { id: 'zm-007', name: 'Chicken Lasagna', price: 380, description: 'Layered pasta with chicken and cheese', category: 'Pasta', isVeg: false, isAvailable: true },
    { id: 'zm-008', name: 'Caesar Salad', price: 220, description: 'Romaine lettuce with caesar dressing', category: 'Salads', isVeg: true, isAvailable: true },
    { id: 'zm-009', name: 'Bruschetta', price: 180, description: 'Toasted bread with tomato topping', category: 'Starters', isVeg: true, isAvailable: true },
    { id: 'zm-010', name: 'Panna Cotta', price: 210, description: 'Italian cream dessert with berries', category: 'Desserts', isVeg: true, isAvailable: false },
  ],
  'zomato-r-003': [
    { id: 'zm-011', name: 'Rava Idli', price: 100, description: 'Semolina idli with cashews', category: 'Breakfast', isVeg: true, isAvailable: true },
    { id: 'zm-012', name: 'Medu Vada', price: 80, description: 'Crispy urad dal vada', category: 'Breakfast', isVeg: true, isAvailable: true },
    { id: 'zm-013', name: 'Uttapam', price: 110, description: 'Thick pancake with vegetable toppings', category: 'Breakfast', isVeg: true, isAvailable: true },
    { id: 'zm-014', name: 'Sambar Rice', price: 130, description: 'Rice mixed with sambar and veggies', category: 'Rice', isVeg: true, isAvailable: true },
    { id: 'zm-015', name: 'Kesari Bath', price: 70, description: 'Sweet semolina pudding', category: 'Desserts', isVeg: true, isAvailable: true },
  ],
};

export const ONDC_MENUS: MenuCollection = {
  'ondc-r-001': [
    { id: 'om-001', name: 'South Indian Thali', price: 180, description: 'Complete meal with rice, sambar, rasam, and sides', category: 'Thali', isVeg: true, isAvailable: true },
    { id: 'om-002', name: 'North Indian Thali', price: 200, description: 'Dal, paneer, roti, rice, and dessert', category: 'Thali', isVeg: true, isAvailable: true },
    { id: 'om-003', name: 'Non-Veg Thali', price: 250, description: 'Chicken curry, dal, rice, and roti', category: 'Thali', isVeg: false, isAvailable: true },
    { id: 'om-004', name: 'Mini Meals', price: 120, description: 'Compact meal with rice and two curries', category: 'Thali', isVeg: true, isAvailable: true },
    { id: 'om-005', name: 'Curd Rice', price: 80, description: 'Rice mixed with seasoned yogurt', category: 'Rice', isVeg: true, isAvailable: true },
  ],
  'ondc-r-002': [
    { id: 'om-006', name: 'Greek Salad Bowl', price: 260, description: 'Fresh vegetables with feta cheese', category: 'Salads', isVeg: true, isAvailable: true },
    { id: 'om-007', name: 'Quinoa Power Bowl', price: 320, description: 'Quinoa with grilled vegetables', category: 'Bowls', isVeg: true, isAvailable: true },
    { id: 'om-008', name: 'Chicken Caesar Bowl', price: 340, description: 'Grilled chicken with romaine', category: 'Bowls', isVeg: false, isAvailable: true },
    { id: 'om-009', name: 'Fruit Smoothie', price: 150, description: 'Blended seasonal fruits', category: 'Beverages', isVeg: true, isAvailable: true },
    { id: 'om-010', name: 'Protein Bar', price: 100, description: 'Homemade oats and nuts bar', category: 'Snacks', isVeg: true, isAvailable: false },
  ],
  'ondc-r-003': [
    { id: 'om-011', name: 'Aloo Paratha', price: 100, description: 'Stuffed potato flatbread', category: 'Parathas', isVeg: true, isAvailable: true },
    { id: 'om-012', name: 'Paneer Paratha', price: 120, description: 'Stuffed cottage cheese flatbread', category: 'Parathas', isVeg: true, isAvailable: true },
    { id: 'om-013', name: 'Gobi Paratha', price: 100, description: 'Stuffed cauliflower flatbread', category: 'Parathas', isVeg: true, isAvailable: true },
    { id: 'om-014', name: 'Lassi', price: 60, description: 'Sweet yogurt drink', category: 'Beverages', isVeg: true, isAvailable: true },
    { id: 'om-015', name: 'Pickle', price: 30, description: 'Homemade mango pickle', category: 'Sides', isVeg: true, isAvailable: true },
  ],
};

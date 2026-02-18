import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

import { Dish } from '../../entities/dish.entity';
import { Restaurant } from '../../entities/restaurant.entity';
import { User, UserRole } from '../../entities/user.entity';

/**
 * Initial seed script for the FoodBot database.
 *
 * Usage:
 *   npx ts-node apps/gateway-api/src/database/seeds/initial-seed.ts
 *
 * Prerequisites:
 *   - PostgreSQL must be running (docker-compose up foodbot-db)
 *   - Database 'foodbot' must exist
 */

const seed = async (): Promise<void> => {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'foodbot',
    entities: [`${__dirname  }/../../entities/*.entity{.ts,.js}`],
    synchronize: true,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established for seeding.');

    const userRepository = dataSource.getRepository(User);
    const restaurantRepository = dataSource.getRepository(Restaurant);
    const dishRepository = dataSource.getRepository(Dish);

    // Check if data already exists
    const existingUsers = await userRepository.count();
    if (existingUsers > 0) {
      console.log('Database already has data. Skipping seed.');
      await dataSource.destroy();
      return;
    }

    // --- Seed Users ---
    const hashedPassword = await bcrypt.hash('TestPassword1!', 10);

    const customer = userRepository.create({
      email: 'customer@example.com',
      password: hashedPassword,
      name: 'Test Customer',
      phoneNumber: '+11234567890',
      role: UserRole.CUSTOMER,
      isEmailVerified: true,
      isActive: true,
      isSuspended: false,
      preferences: {},
    });
    await userRepository.save(customer);
    console.log(`Created customer user: ${customer.email} (ID: ${customer.id})`);

    const owner = userRepository.create({
      email: 'owner@example.com',
      password: hashedPassword,
      name: 'Test Owner',
      phoneNumber: '+11234567892',
      role: UserRole.RESTAURANT_OWNER,
      isEmailVerified: true,
      isActive: true,
      isSuspended: false,
      preferences: {},
    });
    await userRepository.save(owner);
    console.log(`Created owner user: ${owner.email} (ID: ${owner.id})`);

    const admin = userRepository.create({
      email: 'admin@example.com',
      password: hashedPassword,
      name: 'Test Admin',
      phoneNumber: '+11234567894',
      role: UserRole.ADMIN,
      isEmailVerified: true,
      isActive: true,
      isSuspended: false,
      preferences: {},
    });
    await userRepository.save(admin);
    console.log(`Created admin user: ${admin.email} (ID: ${admin.id})`);

    // --- Seed Restaurant ---
    const restaurant = restaurantRepository.create({
      ownerId: owner.id,
      name: 'Test Restaurant',
      description: 'A great test restaurant serving Italian cuisine',
      cuisineTypes: ['Italian', 'Pizza'],
      address: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zipCode: '94105',
        country: 'USA',
      },
      phoneNumber: '+11234567890',
      email: 'test@restaurant.com',
      rating: 4.5,
      reviewCount: 100,
      priceRange: 'moderate',
      isActive: true,
      isApproved: true,
      operatingHours: {
        monday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        tuesday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        wednesday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        thursday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        friday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        saturday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        sunday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
      },
      latitude: 37.7749,
      longitude: -122.4194,
      images: [],
      deliveryRadius: 10,
      minimumOrder: 15,
      deliveryFee: 3.99,
      preparationTime: 30,
    });
    await restaurantRepository.save(restaurant);
    console.log(`Created restaurant: ${restaurant.name} (ID: ${restaurant.id})`);

    // --- Seed Dishes ---
    const dishes = [
      {
        restaurantId: restaurant.id,
        name: 'Margherita Pizza',
        description: 'Classic Italian pizza with fresh mozzarella and basil',
        category: 'Main Course',
        price: 12.99,
        images: ['margherita.jpg'],
        isVegetarian: true,
        isVegan: false,
        isGlutenFree: false,
        allergens: ['Dairy', 'Wheat'],
        spiceLevel: 'none',
        calories: 800,
        preparationTime: 20,
        isAvailable: true,
        tags: ['Popular', 'Bestseller'],
        rating: 4.5,
        totalReviews: 50,
      },
      {
        restaurantId: restaurant.id,
        name: 'Caesar Salad',
        description: 'Fresh romaine lettuce with Caesar dressing and croutons',
        category: 'Salads',
        price: 8.99,
        images: ['caesar.jpg'],
        isVegetarian: true,
        isVegan: false,
        isGlutenFree: false,
        allergens: ['Dairy', 'Wheat'],
        spiceLevel: 'none',
        calories: 350,
        preparationTime: 10,
        isAvailable: true,
        tags: ['Healthy'],
        rating: 4.2,
        totalReviews: 30,
      },
      {
        restaurantId: restaurant.id,
        name: 'Spaghetti Bolognese',
        description: 'Traditional Italian pasta with meat sauce',
        category: 'Main Course',
        price: 14.99,
        images: ['spaghetti.jpg'],
        isVegetarian: false,
        isVegan: false,
        isGlutenFree: false,
        allergens: ['Wheat'],
        spiceLevel: 'mild',
        calories: 650,
        preparationTime: 25,
        isAvailable: true,
        tags: ['Classic'],
        rating: 4.3,
        totalReviews: 40,
      },
      {
        restaurantId: restaurant.id,
        name: 'Tiramisu',
        description: 'Classic Italian dessert with mascarpone and espresso',
        category: 'Desserts',
        price: 7.99,
        images: ['tiramisu.jpg'],
        isVegetarian: true,
        isVegan: false,
        isGlutenFree: false,
        allergens: ['Dairy', 'Wheat', 'Eggs'],
        spiceLevel: 'none',
        calories: 400,
        preparationTime: 5,
        isAvailable: true,
        tags: ['Popular', 'Dessert'],
        rating: 4.7,
        totalReviews: 60,
      },
    ];

    for (const dishData of dishes) {
      const dish = dishRepository.create(dishData);
      await dishRepository.save(dish);
      console.log(`Created dish: ${dish.name} (ID: ${dish.id})`);
    }

    console.log('\nSeed completed successfully!');
    console.log('Summary:');
    console.log(`  - Users: 3 (customer, owner, admin)`);
    console.log(`  - Restaurants: 1`);
    console.log(`  - Dishes: ${dishes.length}`);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
};

seed();

import { faker } from '@faker-js/faker';

export interface MockRestaurant {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  cuisineTypes: string[];
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  phoneNumber: string;
  email: string;
  rating: number;
  totalReviews: number;
  priceRange: 'budget' | 'moderate' | 'expensive' | 'fine-dining';
  isActive: boolean;
  isApproved: boolean;
  operatingHours: OperatingHours;
  images: string[];
  deliveryRadius: number; // in km
  minimumOrder: number;
  deliveryFee: number;
  preparationTime: number; // in minutes
  createdAt: Date;
  updatedAt: Date;
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
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

/**
 * Factory for creating mock restaurant data
 */
export class RestaurantFactory {
  private static readonly CUISINE_TYPES = [
    'Italian',
    'Chinese',
    'Indian',
    'Mexican',
    'Japanese',
    'Thai',
    'American',
    'Mediterranean',
    'French',
    'Korean',
  ];

  /**
   * Creates a mock restaurant with default values
   */
  static create(overrides?: Partial<MockRestaurant>): MockRestaurant {
    const defaultRestaurant: MockRestaurant = {
      id: faker.string.uuid(),
      ownerId: faker.string.uuid(),
      name: faker.company.name() + ' Restaurant',
      description: faker.lorem.paragraph(),
      cuisineTypes: faker.helpers.arrayElements(this.CUISINE_TYPES, 2),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zipCode: faker.location.zipCode(),
        country: 'United States',
        latitude: parseFloat(faker.location.latitude().toString()),
        longitude: parseFloat(faker.location.longitude().toString()),
      },
      phoneNumber: faker.phone.number({ style: 'national' }),
      email: faker.internet.email(),
      rating: faker.number.float({ min: 3.5, max: 5.0, fractionDigits: 1 }),
      totalReviews: faker.number.int({ min: 10, max: 500 }),
      priceRange: faker.helpers.arrayElement([
        'budget',
        'moderate',
        'expensive',
        'fine-dining',
      ] as const),
      isActive: true,
      isApproved: true,
      operatingHours: this.createOperatingHours(),
      images: [
        faker.image.url(),
        faker.image.url(),
        faker.image.url(),
      ],
      deliveryRadius: faker.number.int({ min: 3, max: 15 }),
      minimumOrder: faker.number.float({ min: 10, max: 30, fractionDigits: 2 }),
      deliveryFee: faker.number.float({ min: 2, max: 8, fractionDigits: 2 }),
      preparationTime: faker.number.int({ min: 20, max: 60 }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { ...defaultRestaurant, ...overrides };
  }

  /**
   * Creates multiple mock restaurants
   */
  static createMany(
    count: number,
    overrides?: Partial<MockRestaurant>
  ): MockRestaurant[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * Creates a pending restaurant (not yet approved)
   */
  static createPending(overrides?: Partial<MockRestaurant>): MockRestaurant {
    return this.create({ isApproved: false, isActive: false, ...overrides });
  }

  /**
   * Creates an inactive restaurant
   */
  static createInactive(overrides?: Partial<MockRestaurant>): MockRestaurant {
    return this.create({ isActive: false, ...overrides });
  }

  /**
   * Creates operating hours
   */
  private static createOperatingHours(): OperatingHours {
    const defaultHours: DayHours = {
      isOpen: true,
      openTime: '09:00',
      closeTime: '22:00',
    };

    return {
      monday: { ...defaultHours },
      tuesday: { ...defaultHours },
      wednesday: { ...defaultHours },
      thursday: { ...defaultHours },
      friday: { ...defaultHours },
      saturday: { ...defaultHours },
      sunday: { ...defaultHours },
    };
  }

  /**
   * Creates restaurant creation data
   */
  static createRestaurantData(
    overrides?: Partial<Omit<MockRestaurant, 'id' | 'createdAt' | 'updatedAt'>>
  ) {
    const restaurant = this.create(overrides);
    const { id, createdAt, updatedAt, ...data } = restaurant;
    return data;
  }

  /**
   * Creates restaurant search query
   */
  static createSearchQuery(overrides?: Partial<{
    query: string;
    cuisineTypes: string[];
    priceRange: string[];
    minRating: number;
    latitude: number;
    longitude: number;
    radius: number;
    page: number;
    limit: number;
  }>) {
    return {
      query: faker.word.noun(),
      latitude: parseFloat(faker.location.latitude().toString()),
      longitude: parseFloat(faker.location.longitude().toString()),
      radius: 10,
      page: 1,
      limit: 20,
      ...overrides,
    };
  }
}

/**
 * Helper function to create a mock restaurant
 */
export function createMockRestaurant(
  overrides?: Partial<MockRestaurant>
): MockRestaurant {
  return RestaurantFactory.create(overrides);
}

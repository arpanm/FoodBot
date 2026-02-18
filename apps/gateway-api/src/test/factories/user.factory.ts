import { faker } from '@faker-js/faker';

export interface MockUser {
  id: string;
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
  role: 'customer' | 'restaurant_owner' | 'admin';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  addresses?: MockAddress[];
}

export interface MockAddress {
  id: string;
  userId: string;
  label: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: number;
  longitude: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Factory for creating mock user data
 */
export class UserFactory {
  /**
   * Generates a strong password that meets security requirements
   */
  private static generateStrongPassword(): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const special = '@$!%*?&';

    // Ensure at least one of each required character type
    let password = '';
    password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
    password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
    password += digits.charAt(Math.floor(Math.random() * digits.length));
    password += special.charAt(Math.floor(Math.random() * special.length));

    // Fill the rest with random characters from all sets
    const allChars = lowercase + uppercase + digits + special;
    for (let i = 4; i < 16; i++) {
      password += allChars.charAt(Math.floor(Math.random() * allChars.length));
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Creates a mock user with default values
   */
  static create(overrides?: Partial<MockUser>): MockUser {
    const defaultUser: MockUser = {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      password: this.generateStrongPassword(),
      name: faker.person.fullName(),
      phoneNumber: faker.phone.number({ style: 'national' }),
      role: 'customer',
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { ...defaultUser, ...overrides };
  }

  /**
   * Creates multiple mock users
   */
  static createMany(count: number, overrides?: Partial<MockUser>): MockUser[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * Creates a mock customer user
   */
  static createCustomer(overrides?: Partial<MockUser>): MockUser {
    return this.create({ role: 'customer', ...overrides });
  }

  /**
   * Creates a mock restaurant owner
   */
  static createRestaurantOwner(overrides?: Partial<MockUser>): MockUser {
    return this.create({ role: 'restaurant_owner', ...overrides });
  }

  /**
   * Creates a mock admin user
   */
  static createAdmin(overrides?: Partial<MockUser>): MockUser {
    return this.create({ role: 'admin', ...overrides });
  }

  /**
   * Creates a mock user for registration
   */
  static createRegistrationData(
    overrides?: Partial<{
      email: string;
      password: string;
      name: string;
      phoneNumber: string;
    }>
  ) {
    return {
      email: faker.internet.email(),
      password: this.generateStrongPassword(),
      name: faker.person.fullName(),
      phoneNumber: faker.phone.number({ style: 'national' }),
      ...overrides,
    };
  }

  /**
   * Creates a mock user for login
   */
  static createLoginData(
    overrides?: Partial<{ email: string; password: string }>
  ) {
    return {
      email: faker.internet.email(),
      password: this.generateStrongPassword(),
      ...overrides,
    };
  }
}

/**
 * Factory for creating mock address data
 */
export class AddressFactory {
  /**
   * Creates a mock address
   */
  static create(overrides?: Partial<MockAddress>): MockAddress {
    const defaultAddress: MockAddress = {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      label: faker.helpers.arrayElement(['Home', 'Work', 'Other']),
      street: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state(),
      zipCode: faker.location.zipCode(),
      country: 'United States',
      latitude: parseFloat(faker.location.latitude().toString()),
      longitude: parseFloat(faker.location.longitude().toString()),
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return { ...defaultAddress, ...overrides };
  }

  /**
   * Creates multiple mock addresses
   */
  static createMany(
    count: number,
    overrides?: Partial<MockAddress>
  ): MockAddress[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }

  /**
   * Creates a mock address for a specific user
   */
  static createForUser(
    userId: string,
    overrides?: Partial<MockAddress>
  ): MockAddress {
    return this.create({ userId, ...overrides });
  }

  /**
   * Creates a default address for a user
   */
  static createDefaultAddress(
    userId: string,
    overrides?: Partial<MockAddress>
  ): MockAddress {
    return this.create({ userId, isDefault: true, ...overrides });
  }
}

/**
 * Helper function to create a complete mock user
 */
export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  return UserFactory.create(overrides);
}

/**
 * Helper function to create a mock address
 */
export function createMockAddress(overrides?: Partial<MockAddress>): MockAddress {
  return AddressFactory.create(overrides);
}

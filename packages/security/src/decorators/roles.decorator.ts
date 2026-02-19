import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../types';
import { ROLES_KEY } from '../guards/roles.guard';

/**
 * Roles Decorator
 * Restrict access to specific user roles
 *
 * @example
 * @Roles(UserRole.ADMIN, UserRole.RESTAURANT_OWNER)
 * @Post('restaurants')
 * createRestaurant() {}
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

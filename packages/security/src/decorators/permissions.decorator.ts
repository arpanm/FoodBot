import { SetMetadata } from '@nestjs/common';
import { Permission } from '../types';
import { PERMISSIONS_KEY } from '../guards/permissions.guard';

/**
 * Permissions Decorator
 * Restrict access to specific permissions
 *
 * @example
 * @Permissions(Permission.ORDER_WRITE, Permission.ORDER_READ)
 * @Post('orders')
 * createOrder() {}
 */
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

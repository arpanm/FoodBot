import { Injectable } from '@nestjs/common';
import { UserRole, Permission } from '../types';

/**
 * RBAC Service
 * OWASP A01: Broken Access Control Protection
 *
 * Manages role-based access control and permission mapping
 */
@Injectable()
export class RbacService {
  // Role to permissions mapping
  private readonly rolePermissions: Map<UserRole, Permission[]> = new Map([
    [
      UserRole.ADMIN,
      [
        // Admin has all permissions
        Permission.USER_READ,
        Permission.USER_WRITE,
        Permission.USER_DELETE,
        Permission.RESTAURANT_READ,
        Permission.RESTAURANT_WRITE,
        Permission.RESTAURANT_DELETE,
        Permission.RESTAURANT_MANAGE,
        Permission.ORDER_READ,
        Permission.ORDER_WRITE,
        Permission.ORDER_DELETE,
        Permission.ORDER_MANAGE,
        Permission.MENU_READ,
        Permission.MENU_WRITE,
        Permission.MENU_DELETE,
        Permission.ADMIN_ACCESS,
        Permission.SYSTEM_CONFIG,
      ],
    ],
    [
      UserRole.RESTAURANT_OWNER,
      [
        Permission.RESTAURANT_READ,
        Permission.RESTAURANT_WRITE,
        Permission.RESTAURANT_MANAGE,
        Permission.ORDER_READ,
        Permission.ORDER_WRITE,
        Permission.MENU_READ,
        Permission.MENU_WRITE,
        Permission.MENU_DELETE,
      ],
    ],
    [
      UserRole.CUSTOMER,
      [
        Permission.RESTAURANT_READ,
        Permission.ORDER_READ,
        Permission.ORDER_WRITE,
        Permission.MENU_READ,
        Permission.USER_READ,
        Permission.USER_WRITE,
      ],
    ],
    [
      UserRole.DELIVERY_PARTNER,
      [
        Permission.ORDER_READ,
        Permission.ORDER_WRITE,
        Permission.USER_READ,
        Permission.USER_WRITE,
      ],
    ],
    [
      UserRole.SUPPORT,
      [
        Permission.USER_READ,
        Permission.RESTAURANT_READ,
        Permission.ORDER_READ,
        Permission.ORDER_WRITE,
        Permission.MENU_READ,
      ],
    ],
  ]);

  /**
   * Get permissions for a role
   */
  getPermissionsForRole(role: UserRole): Permission[] {
    return this.rolePermissions.get(role) || [];
  }

  /**
   * Get permissions for multiple roles
   */
  getPermissionsForRoles(roles: UserRole[]): Permission[] {
    const permissions = new Set<Permission>();

    roles.forEach((role) => {
      const rolePerms = this.getPermissionsForRole(role);
      rolePerms.forEach((perm) => permissions.add(perm));
    });

    return Array.from(permissions);
  }

  /**
   * Check if role has permission
   */
  roleHasPermission(role: UserRole, permission: Permission): boolean {
    const permissions = this.getPermissionsForRole(role);
    return permissions.includes(permission);
  }

  /**
   * Check if any of the roles has permission
   */
  rolesHavePermission(roles: UserRole[], permission: Permission): boolean {
    return roles.some((role) => this.roleHasPermission(role, permission));
  }

  /**
   * Check if user has all required permissions
   */
  hasAllPermissions(userPermissions: Permission[], requiredPermissions: Permission[]): boolean {
    return requiredPermissions.every((perm) => userPermissions.includes(perm));
  }

  /**
   * Check if user has any of the required permissions
   */
  hasAnyPermission(userPermissions: Permission[], requiredPermissions: Permission[]): boolean {
    return requiredPermissions.some((perm) => userPermissions.includes(perm));
  }

  /**
   * Add permission to role (runtime)
   */
  addPermissionToRole(role: UserRole, permission: Permission): void {
    const permissions = this.rolePermissions.get(role) || [];
    if (!permissions.includes(permission)) {
      permissions.push(permission);
      this.rolePermissions.set(role, permissions);
    }
  }

  /**
   * Remove permission from role (runtime)
   */
  removePermissionFromRole(role: UserRole, permission: Permission): void {
    const permissions = this.rolePermissions.get(role) || [];
    const index = permissions.indexOf(permission);
    if (index !== -1) {
      permissions.splice(index, 1);
      this.rolePermissions.set(role, permissions);
    }
  }

  /**
   * Check if user can access resource
   */
  canAccessResource(
    userRoles: UserRole[],
    resource: string,
    action: 'read' | 'write' | 'delete' | 'manage'
  ): boolean {
    // Map resource and action to permission
    const permissionMap: Record<string, Record<string, Permission | null>> = {
      user: {
        read: Permission.USER_READ,
        write: Permission.USER_WRITE,
        delete: Permission.USER_DELETE,
        manage: null,
      },
      restaurant: {
        read: Permission.RESTAURANT_READ,
        write: Permission.RESTAURANT_WRITE,
        delete: Permission.RESTAURANT_DELETE,
        manage: Permission.RESTAURANT_MANAGE,
      },
      order: {
        read: Permission.ORDER_READ,
        write: Permission.ORDER_WRITE,
        delete: Permission.ORDER_DELETE,
        manage: Permission.ORDER_MANAGE,
      },
      menu: {
        read: Permission.MENU_READ,
        write: Permission.MENU_WRITE,
        delete: Permission.MENU_DELETE,
        manage: null,
      },
    };

    const permission = permissionMap[resource]?.[action];
    if (!permission) return false;

    return this.rolesHavePermission(userRoles, permission);
  }

  /**
   * Get all roles
   */
  getAllRoles(): UserRole[] {
    return Object.values(UserRole);
  }

  /**
   * Get all permissions
   */
  getAllPermissions(): Permission[] {
    return Object.values(Permission);
  }

  /**
   * Export role-permission mapping for auditing
   */
  exportRolePermissions(): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    this.rolePermissions.forEach((permissions, role) => {
      result[role] = permissions;
    });

    return result;
  }
}

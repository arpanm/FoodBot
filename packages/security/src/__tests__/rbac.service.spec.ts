import { RbacService } from '../rbac/rbac.service';
import { UserRole, Permission } from '../types';

describe('RbacService', () => {
  let service: RbacService;

  beforeEach(() => {
    service = new RbacService();
  });

  describe('getPermissionsForRole', () => {
    it('should return all permissions for ADMIN', () => {
      const permissions = service.getPermissionsForRole(UserRole.ADMIN);

      expect(permissions).toContain(Permission.ADMIN_ACCESS);
      expect(permissions).toContain(Permission.SYSTEM_CONFIG);
      expect(permissions.length).toBeGreaterThan(10);
    });

    it('should return limited permissions for CUSTOMER', () => {
      const permissions = service.getPermissionsForRole(UserRole.CUSTOMER);

      expect(permissions).toContain(Permission.ORDER_READ);
      expect(permissions).toContain(Permission.ORDER_WRITE);
      expect(permissions).not.toContain(Permission.ADMIN_ACCESS);
    });

    it('should return restaurant permissions for RESTAURANT_OWNER', () => {
      const permissions = service.getPermissionsForRole(UserRole.RESTAURANT_OWNER);

      expect(permissions).toContain(Permission.RESTAURANT_MANAGE);
      expect(permissions).toContain(Permission.MENU_WRITE);
      expect(permissions).not.toContain(Permission.ADMIN_ACCESS);
    });
  });

  describe('getPermissionsForRoles', () => {
    it('should merge permissions from multiple roles', () => {
      const permissions = service.getPermissionsForRoles([
        UserRole.CUSTOMER,
        UserRole.DELIVERY_PARTNER,
      ]);

      expect(permissions).toContain(Permission.ORDER_READ);
      expect(permissions).toContain(Permission.ORDER_WRITE);
      // Should not duplicate permissions
      const uniquePermissions = new Set(permissions);
      expect(permissions.length).toBe(uniquePermissions.size);
    });
  });

  describe('roleHasPermission', () => {
    it('should return true when role has permission', () => {
      const result = service.roleHasPermission(UserRole.ADMIN, Permission.ADMIN_ACCESS);

      expect(result).toBe(true);
    });

    it('should return false when role does not have permission', () => {
      const result = service.roleHasPermission(UserRole.CUSTOMER, Permission.ADMIN_ACCESS);

      expect(result).toBe(false);
    });
  });

  describe('rolesHavePermission', () => {
    it('should return true if any role has permission', () => {
      const result = service.rolesHavePermission(
        [UserRole.CUSTOMER, UserRole.ADMIN],
        Permission.ADMIN_ACCESS
      );

      expect(result).toBe(true);
    });

    it('should return false if no role has permission', () => {
      const result = service.rolesHavePermission(
        [UserRole.CUSTOMER, UserRole.DELIVERY_PARTNER],
        Permission.ADMIN_ACCESS
      );

      expect(result).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all required permissions', () => {
      const userPermissions = [Permission.ORDER_READ, Permission.ORDER_WRITE, Permission.MENU_READ];
      const required = [Permission.ORDER_READ, Permission.MENU_READ];

      const result = service.hasAllPermissions(userPermissions, required);

      expect(result).toBe(true);
    });

    it('should return false when user is missing permissions', () => {
      const userPermissions = [Permission.ORDER_READ];
      const required = [Permission.ORDER_READ, Permission.ADMIN_ACCESS];

      const result = service.hasAllPermissions(userPermissions, required);

      expect(result).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one permission', () => {
      const userPermissions = [Permission.ORDER_READ];
      const required = [Permission.ORDER_READ, Permission.ADMIN_ACCESS];

      const result = service.hasAnyPermission(userPermissions, required);

      expect(result).toBe(true);
    });

    it('should return false when user has no required permissions', () => {
      const userPermissions = [Permission.ORDER_READ];
      const required = [Permission.ADMIN_ACCESS, Permission.SYSTEM_CONFIG];

      const result = service.hasAnyPermission(userPermissions, required);

      expect(result).toBe(false);
    });
  });

  describe('canAccessResource', () => {
    it('should allow ADMIN to manage all resources', () => {
      expect(service.canAccessResource([UserRole.ADMIN], 'order', 'manage')).toBe(true);
      expect(service.canAccessResource([UserRole.ADMIN], 'restaurant', 'delete')).toBe(true);
      expect(service.canAccessResource([UserRole.ADMIN], 'user', 'write')).toBe(true);
    });

    it('should allow CUSTOMER to read orders', () => {
      expect(service.canAccessResource([UserRole.CUSTOMER], 'order', 'read')).toBe(true);
    });

    it('should not allow CUSTOMER to manage restaurants', () => {
      expect(service.canAccessResource([UserRole.CUSTOMER], 'restaurant', 'manage')).toBe(false);
    });

    it('should allow RESTAURANT_OWNER to manage restaurants', () => {
      expect(service.canAccessResource([UserRole.RESTAURANT_OWNER], 'restaurant', 'manage')).toBe(
        true
      );
    });
  });

  describe('addPermissionToRole and removePermissionFromRole', () => {
    it('should add permission to role', () => {
      service.addPermissionToRole(UserRole.CUSTOMER, Permission.ADMIN_ACCESS);
      const permissions = service.getPermissionsForRole(UserRole.CUSTOMER);

      expect(permissions).toContain(Permission.ADMIN_ACCESS);
    });

    it('should remove permission from role', () => {
      service.removePermissionFromRole(UserRole.CUSTOMER, Permission.ORDER_READ);
      const permissions = service.getPermissionsForRole(UserRole.CUSTOMER);

      expect(permissions).not.toContain(Permission.ORDER_READ);
    });

    it('should not duplicate permissions', () => {
      const initialPermissions = service.getPermissionsForRole(UserRole.CUSTOMER);
      const orderReadCount = initialPermissions.filter((p) => p === Permission.ORDER_READ).length;

      service.addPermissionToRole(UserRole.CUSTOMER, Permission.ORDER_READ);
      const updatedPermissions = service.getPermissionsForRole(UserRole.CUSTOMER);
      const newOrderReadCount = updatedPermissions.filter((p) => p === Permission.ORDER_READ).length;

      expect(newOrderReadCount).toBe(orderReadCount);
    });
  });

  describe('exportRolePermissions', () => {
    it('should export all role-permission mappings', () => {
      const exported = service.exportRolePermissions();

      expect(exported[UserRole.ADMIN]).toBeDefined();
      expect(exported[UserRole.CUSTOMER]).toBeDefined();
      expect(Array.isArray(exported[UserRole.ADMIN])).toBe(true);
    });
  });
});

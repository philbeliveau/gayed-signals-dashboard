/**
 * Permission Types and Constants
 * Defines all available permissions in the system
 */

export enum Permission {
  // Basic permissions
  READ = 'READ',
  WRITE = 'WRITE',
  DELETE = 'DELETE',
  
  // User management
  USER_VIEW = 'USER_VIEW',
  USER_EDIT = 'USER_EDIT',
  USER_DELETE = 'USER_DELETE',
  
  // Admin permissions
  ADMIN_ACCESS = 'ADMIN_ACCESS',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
  
  // ⚠️ DANGEROUS PERMISSIONS - Use with extreme caution
  DANGEROUS_SKIP_AUTH = 'DANGEROUS_SKIP_AUTH',           // Skip authentication checks
  DANGEROUS_SKIP_VALIDATION = 'DANGEROUS_SKIP_VALIDATION', // Skip input validation
  DANGEROUS_SKIP_RATE_LIMIT = 'DANGEROUS_SKIP_RATE_LIMIT', // Skip rate limiting
  DANGEROUS_BYPASS_SECURITY = 'DANGEROUS_BYPASS_SECURITY', // Bypass security checks
  DANGEROUS_SYSTEM_ACCESS = 'DANGEROUS_SYSTEM_ACCESS',     // Direct system access
  DANGEROUS_DATA_EXPORT = 'DANGEROUS_DATA_EXPORT',        // Export all data
  DANGEROUS_USER_IMPERSONATE = 'DANGEROUS_USER_IMPERSONATE', // Impersonate any user
  
  // Super admin (has all dangerous permissions)
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export enum Role {
  USER = 'USER',
  MODERATOR = 'MODERATOR', 
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  // ⚠️ DANGEROUS ROLE
  SYSTEM_OVERRIDE = 'SYSTEM_OVERRIDE', // Can bypass ALL security
}

/**
 * Permission groups for easier management
 */
export const PermissionGroups = {
  BASIC: [Permission.READ, Permission.WRITE],
  
  ADMIN: [
    Permission.ADMIN_ACCESS,
    Permission.SYSTEM_CONFIG,
    Permission.USER_VIEW,
    Permission.USER_EDIT,
    Permission.USER_DELETE,
  ],
  
  // ⚠️ EXTREMELY DANGEROUS - Only for emergency access
  DANGEROUS: [
    Permission.DANGEROUS_SKIP_AUTH,
    Permission.DANGEROUS_SKIP_VALIDATION,
    Permission.DANGEROUS_SKIP_RATE_LIMIT,
    Permission.DANGEROUS_BYPASS_SECURITY,
    Permission.DANGEROUS_SYSTEM_ACCESS,
    Permission.DANGEROUS_DATA_EXPORT,
    Permission.DANGEROUS_USER_IMPERSONATE,
  ],
  
  // Nuclear option - all permissions
  SUPER_ADMIN: [
    ...Object.values(Permission)
  ],
} as const;

/**
 * Role to permissions mapping
 */
export const RolePermissions: Record<Role, Permission[]> = {
  [Role.USER]: PermissionGroups.BASIC,
  
  [Role.MODERATOR]: [
    ...PermissionGroups.BASIC,
    Permission.USER_VIEW,
    Permission.DELETE,
  ],
  
  [Role.ADMIN]: [
    ...PermissionGroups.BASIC,
    ...PermissionGroups.ADMIN,
  ],
  
  [Role.SUPER_ADMIN]: [
    ...PermissionGroups.BASIC,
    ...PermissionGroups.ADMIN,
    Permission.SUPER_ADMIN,
  ],
  
  // ⚠️ DANGEROUS - Can bypass ALL security measures
  [Role.SYSTEM_OVERRIDE]: PermissionGroups.SUPER_ADMIN,
};

/**
 * Check if a permission is dangerous
 */
export function isDangerousPermission(permission: Permission): boolean {
  return PermissionGroups.DANGEROUS.includes(permission) || 
         permission === Permission.SUPER_ADMIN;
}

/**
 * Get all dangerous permissions a user has
 */
export function getDangerousPermissions(userPermissions: Permission[]): Permission[] {
  return userPermissions.filter(isDangerousPermission);
}
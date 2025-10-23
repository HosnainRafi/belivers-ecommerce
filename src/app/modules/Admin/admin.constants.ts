// src/app/modules/Admin/admin.constants.ts

// Using 'as const' provides strong, literal types for the values
export const ADMIN_ROLE = {
  super_admin: "super_admin",
  manager: "manager",
} as const;

// An array version for Zod enum validation
export const AdminRole = ["super_admin", "manager"];

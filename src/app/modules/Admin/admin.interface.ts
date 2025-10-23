// src/app/modules/Admin/admin.interface.ts
import { Model } from "mongoose";

// Type for the Admin Role
export type TAdminRole = "super_admin" | "manager";

export type TAdmin = {
  name: string;
  email: string;
  password: string; // The password field is selected: false in the model
  role: TAdminRole;
};

// Interface for Zod validation on login
export type TLoginAdmin = Pick<TAdmin, "email" | "password">;

// Interface for the login response
export type TLoginAdminResponse = {
  accessToken: string;
  adminData: {
    _id: string;
    name: string;
    email: string;
    role: TAdminRole;
  };
};

// --- For Mongoose Model Statics ---
export interface AdminModel extends Model<TAdmin> {
  // Static method to check if an admin exists by email
  isAdminExists(email: string): Promise<TAdmin | null>;

  // Static method to check password
  isUserPasswordMatched(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean>;
}

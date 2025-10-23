// src/app/modules/Admin/admin.validation.ts
import { z } from "zod";
import { AdminRole } from "./admin.constants";

const createAdminZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, { message: "Name is required" }), // FIX
    email: z
      .string()
      .min(1, { message: "Email is required" }) // FIX
      .email("Invalid email address"),
    password: z
      .string()
      .min(1, { message: "Password is required" }) // FIX
      .min(6, "Password must be at least 6 characters long"),
    role: z.enum([...AdminRole] as [string, ...string[]], {
      message: "Role is required", // FIX
    }),
  }),
});

const loginAdminZodSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, { message: "Email is required" }) // FIX
      .email("Invalid email address"),
    password: z.string().min(1, { message: "Password is required" }), // FIX
  }),
});

export const AdminValidation = {
  createAdminZodSchema,
  loginAdminZodSchema,
};

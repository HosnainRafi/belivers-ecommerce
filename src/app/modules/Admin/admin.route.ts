// src/app/modules/Admin/admin.route.ts
import express from "express";
import validateRequest from "../../middlewares/validateRequest";
import { AdminController } from "./admin.controller";
import { AdminValidation } from "./admin.validation";

const router = express.Router();

// Route for creating a new admin
// In a real app, this should be protected (e.g., only 'super_admin' can create 'manager')
router.post(
  "/register",
  validateRequest(AdminValidation.createAdminZodSchema),
  AdminController.createAdmin
);

// Route for admin login
router.post(
  "/login",
  validateRequest(AdminValidation.loginAdminZodSchema),
  AdminController.loginAdmin
);

export const AdminRoutes = router;

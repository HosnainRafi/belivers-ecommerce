// src/app/modules/Category/category.route.ts
import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ADMIN_ROLE } from "../Admin/admin.constants";
import { CategoryController } from "./category.controller";
import { CategoryValidation } from "./category.validation";

const router = express.Router();

router.post(
  "/",
  auth(ADMIN_ROLE.manager, ADMIN_ROLE.super_admin), // Only admins can create
  validateRequest(CategoryValidation.createCategoryZodSchema),
  CategoryController.createCategory
);

router.get("/", CategoryController.getAllCategories); // Anyone can view all
router.get("/parent/:parentId", CategoryController.getSubcategoriesByParent); // View subcategories by parent

router.get("/:id", CategoryController.getSingleCategory); // Anyone can view one

router.get("/subcategories/all", CategoryController.getAllSubcategories);
router.patch(
  "/:id",
  auth(ADMIN_ROLE.manager, ADMIN_ROLE.super_admin), // Only admins can update
  validateRequest(CategoryValidation.updateCategoryZodSchema),
  CategoryController.updateCategory
);

router.delete(
  "/:id",
  auth(ADMIN_ROLE.manager, ADMIN_ROLE.super_admin), // Only admins can delete
  CategoryController.deleteCategory
);

export const CategoryRoutes = router;

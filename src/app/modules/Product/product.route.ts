// src/app/modules/Product/product.route.ts
import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ADMIN_ROLE } from "../Admin/admin.constants";
import { ProductController } from "./product.controller";
import { ProductValidation } from "./product.validation";

const router = express.Router();

router.post(
  "/apply-category-discount",
  auth(ADMIN_ROLE.manager, ADMIN_ROLE.super_admin),
  validateRequest(ProductValidation.applyCategoryDiscountZodSchema),
  ProductController.applyCategoryDiscount
);

router.post(
  "/",
  auth(ADMIN_ROLE.manager, ADMIN_ROLE.super_admin), // Only admins can create
  validateRequest(ProductValidation.createProductZodSchema),
  ProductController.createProduct
);

router.get("/", ProductController.getAllProducts); // Anyone can view all (filtered)

router.get("/:id", ProductController.getSingleProduct); // Anyone can view one (by ID or Slug)

router.patch(
  "/:id",
  auth(ADMIN_ROLE.manager, ADMIN_ROLE.super_admin), // Only admins can update
  validateRequest(ProductValidation.updateProductZodSchema),
  ProductController.updateProduct
);

router.delete(
  "/:id",
  auth(ADMIN_ROLE.manager, ADMIN_ROLE.super_admin), // Only admins can delete
  ProductController.deleteProduct
);

router.delete(
  "/:id/force", // Use a distinct path like '/force' or '/permanent'
  auth(ADMIN_ROLE.super_admin), // Maybe restrict to super_admin only?
  ProductController.hardDeleteProduct // Calls hard delete controller
);

export const ProductRoutes = router;

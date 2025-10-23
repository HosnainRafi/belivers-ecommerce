// src/app/modules/Coupon/coupon.route.ts
import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ADMIN_ROLE } from "../Admin/admin.constants";
import { CouponController } from "./coupon.controller";
import { CouponValidation } from "./coupon.validation";

const router = express.Router();

// Public route for applying a coupon
router.post(
  "/apply",
  validateRequest(CouponValidation.applyCouponZodSchema),
  CouponController.applyCoupon
);

// --- Admin-Only Routes ---

router.post(
  "/",
  auth(ADMIN_ROLE.manager, ADMIN_ROLE.super_admin),
  validateRequest(CouponValidation.createCouponZodSchema),
  CouponController.createCoupon
);

router.get(
  "/",
  auth(ADMIN_ROLE.manager, ADMIN_ROLE.super_admin),
  CouponController.getAllCoupons
);

router.get(
  "/:id",
  auth(ADMIN_ROLE.manager, ADMIN_ROLE.super_admin),
  CouponController.getSingleCoupon
);

router.patch(
  "/:id",
  auth(ADMIN_ROLE.manager, ADMIN_ROLE.super_admin),
  validateRequest(CouponValidation.updateCouponZodSchema),
  CouponController.updateCoupon
);

router.delete(
  "/:id",
  auth(ADMIN_ROLE.manager, ADMIN_ROLE.super_admin),
  CouponController.deleteCoupon
);

export const CouponRoutes = router;

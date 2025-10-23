// src/app/modules/Review/review.route.ts
import express from "express";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { ADMIN_ROLE } from "../Admin/admin.constants";
import { ReviewController } from "./review.controller";
import { ReviewValidation } from "./review.validation";

const router = express.Router();

// --- Public Routes ---
router.post(
  "/",
  validateRequest(ReviewValidation.createReviewZodSchema),
  ReviewController.createReview
);

router.get(
  "/product/:productId",
  ReviewController.getApprovedReviewsForProduct
);

// --- Admin Routes ---
router.get(
  "/",
  auth(ADMIN_ROLE.manager, ADMIN_ROLE.super_admin),
  ReviewController.getAllReviews
);

router.patch(
  "/:id",
  auth(ADMIN_ROLE.manager, ADMIN_ROLE.super_admin),
  validateRequest(ReviewValidation.updateReviewZodSchema),
  ReviewController.updateReview
);

router.delete(
  "/:id",
  auth(ADMIN_ROLE.manager, ADMIN_ROLE.super_admin),
  ReviewController.deleteReview
);

export const ReviewRoutes = router;

// src/app/modules/Review/review.validation.ts
import { z } from "zod";

const createReviewZodSchema = z.object({
  body: z.object({
    productId: z.string().min(1, { message: "Product ID is required" }),
    orderId: z.string().min(1, { message: "Order ID is required" }),
    customerName: z.string().min(1, { message: "Your name is required" }),
    rating: z.coerce
      .number({ message: "Rating is required" })
      .int()
      .min(1, { message: "Rating must be at least 1" })
      .max(5, { message: "Rating cannot be more than 5" }),
    comment: z.string().min(1, { message: "Review comment is required" }),
  }),
});

const updateReviewZodSchema = z.object({
  body: z.object({
    isApproved: z.boolean({ message: "Approval status is required" }),
    comment: z.string().optional(), // Admin might edit a comment
  }),
});

export const ReviewValidation = {
  createReviewZodSchema,
  updateReviewZodSchema,
};

// src/app/modules/Coupon/coupon.validation.ts
import { z } from "zod";
import { CouponType } from "./coupon.constants";

// 1. Define the CORE body schema first
const couponBodyBaseSchema = z
  .object({
    code: z
      .string()
      .min(1, { message: "Coupon code is required" })
      .toUpperCase(), // Standardize code to uppercase
    description: z.string().optional(),
    type: z.enum([...CouponType] as [string, ...string[]], {
      message: "Coupon type is required",
    }),
    value: z.coerce
      .number({
        message: "Discount value is required and must be a number",
      })
      .positive({ message: "Discount value must be positive" }),
    minOrderAmount: z.coerce.number().positive().optional(),
    maxDiscountAmount: z.coerce.number().positive().optional(),
    usageLimit: z.coerce
      .number({
        message: "Usage limit is required and must be a number",
      })
      .int()
      .positive({ message: "Usage limit must be a positive integer" }),
    validFrom: z.coerce.date({ message: 'Invalid "valid from" date' }),
    validUntil: z.coerce.date({ message: 'Invalid "valid until" date' }),
    isActive: z.boolean().default(true),
  })
  .refine(
    (data) => {
      // 'validUntil' date must be after 'validFrom' date
      return data.validUntil > data.validFrom;
    },
    {
      message: '"Valid until" date must be after "valid from" date',
      path: ["validUntil"],
    }
  )
  .refine(
    (data) => {
      // If type is 'percentage', value cannot be more than 100
      if (data.type === "percentage") {
        return data.value <= 100;
      }
      return true;
    },
    {
      message: "Percentage value cannot exceed 100",
      path: ["value"],
    }
  )
  .refine(
    (data) => {
      // 'maxDiscountAmount' is only allowed for 'percentage' type
      if (data.type === "fixed" && data.maxDiscountAmount) {
        return false;
      }
      return true;
    },
    {
      message: 'Fixed coupons cannot have a "max discount amount"',
      path: ["maxDiscountAmount"],
    }
  );

// 2. Create the 'create' schema
const createCouponZodSchema = z
  .object({
    body: couponBodyBaseSchema,
  })
  .transform((data) => ({
    body: {
      ...data.body,
      code: data.body.code.toUpperCase().trim(),
    },
  }));

// 3. Create the 'update' schema
const updateCouponZodSchema = z
  .object({
    //
    // --- THIS IS THE FIX ---
    // Change .deepPartial() to .partial()
    //
    body: couponBodyBaseSchema.partial(),
  })
  .refine(
    // This type annotation should now be correct
    (data: { body: Partial<z.infer<typeof couponBodyBaseSchema>> }) => {
      if (data.body?.validFrom && data.body?.validUntil) {
        return data.body.validUntil > data.body.validFrom;
      }
      return true;
    },
    {
      message: '"Valid until" date must be after "valid from" date',
      path: ["body", "validUntil"],
    }
  );

// ... (rest of the file is unchanged) ...
// --- Omitted for brevity ---

const applyCouponZodSchema = z.object({
  body: z.object({
    code: z.string().min(1, { message: "Coupon code is required" }),
    orderTotal: z.coerce
      .number({ message: "Order total is required" })
      .positive({ message: "Order total must be positive" }),
  }),
});

export const CouponValidation = {
  createCouponZodSchema,
  updateCouponZodSchema,
  applyCouponZodSchema,
};

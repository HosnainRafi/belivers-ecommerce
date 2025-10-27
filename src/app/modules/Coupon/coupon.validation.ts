// src/app/modules/Coupon/coupon.validation.ts
import { z } from "zod";
import { CouponType } from "./coupon.constants";

// 1. Define the CORE body schema first
const couponBodyBaseSchema = z
  .object({
    code: z
      .string()
      .min(1, { message: "Coupon code is required" })
      .toUpperCase(),
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

    // --- ADD THESE NEW FIELDS ---
    appliesToAllProducts: z.boolean().default(true).optional(),
    appliesToCategories: z.array(z.string()).optional(), // Array of string IDs
    appliesToProducts: z.array(z.string()).optional(), // Array of string IDs
  })
  // ... (existing .refine for dates, percentage, etc. are unchanged) ...
  .refine((data) => data.validUntil > data.validFrom, {
    message: '"Valid until" date must be after "valid from" date',
    path: ["validUntil"],
  })
  .refine(
    (data) => {
      if (data.type === "percentage") return data.value <= 100;
      return true;
    },
    { message: "Percentage value cannot exceed 100", path: ["value"] }
  )
  .refine(
    (data) => {
      if (data.type === "fixed" && data.maxDiscountAmount) return false;
      return true;
    },
    {
      message: 'Fixed coupons cannot have a "max discount amount"',
      path: ["maxDiscountAmount"],
    }
  )
  // --- ADD NEW REFINEMENT RULES ---
  .refine(
    (data) => {
      // If not all products, must specify categories OR products
      if (data.appliesToAllProducts === false) {
        const hasCategories =
          data.appliesToCategories && data.appliesToCategories.length > 0;
        const hasProducts =
          data.appliesToProducts && data.appliesToProducts.length > 0;
        return hasCategories || hasProducts; // Must have one
      }
      return true;
    },
    {
      message:
        "If coupon doesn't apply to all products, you must specify categories or products.",
      path: ["appliesToAllProducts"],
    }
  )
  .refine(
    (data) => {
      // Cannot have both category and product restrictions (simplifies logic)
      const hasCategories =
        data.appliesToCategories && data.appliesToCategories.length > 0;
      const hasProducts =
        data.appliesToProducts && data.appliesToProducts.length > 0;
      return !(hasCategories && hasProducts); // Cannot be both
    },
    {
      message: "Coupon can apply to categories OR products, but not both.",
      path: ["appliesToCategories"], // Or appliesToProducts
    }
  );

// 2. Create the 'create' schema (unchanged)
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

// 3. Create the 'update' schema (unchanged, .partial() handles it)
const updateCouponZodSchema = z
  .object({
    body: couponBodyBaseSchema.partial(),
  })
  .refine(
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

// Schema for a single item in the cart
const couponCartItemZodSchema = z.object({
  productId: z.string().min(1, { message: "Product ID is required" }),
  productSizeId: z.string().min(1, { message: "Product Size ID is required" }),
  quantity: z.coerce
    .number()
    .int()
    .positive({ message: "Quantity must be a positive integer" }),
});

// Update this schema to take 'items' instead of 'orderTotal'
const applyCouponZodSchema = z.object({
  body: z.object({
    code: z.string().min(1, { message: "Coupon code is required" }),
    items: z
      .array(couponCartItemZodSchema)
      .min(1, { message: "At least one item is required to apply a coupon" }),
  }),
});

export const CouponValidation = {
  createCouponZodSchema,
  updateCouponZodSchema,
  applyCouponZodSchema, // This is now updated
};

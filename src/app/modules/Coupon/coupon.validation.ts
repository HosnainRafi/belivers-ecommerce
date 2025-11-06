// src/app/modules/Coupon/coupon.validation.ts
import { z } from "zod";
import { CouponType } from "./coupon.constants";

// --- Base Schema (Common fields) ---
const couponBaseFields = z.object({
  code: z.string().min(1, { message: "Coupon code is required" }).toUpperCase(),
  description: z.string().optional(),
  value: z.coerce
    .number({
      message: "Discount value is required and must be a number",
    })
    .positive({ message: "Discount value must be positive" }),
  minOrderAmount: z.coerce.number().positive().optional(),
  usageLimit: z.coerce
    .number({
      message: "Usage limit is required and must be a number",
    })
    .int()
    .positive({ message: "Usage limit must be a positive integer" }),
  validFrom: z.coerce.date({ message: 'Invalid "valid from" date' }),
  validUntil: z.coerce.date({ message: 'Invalid "valid until" date' }),
  isActive: z.boolean().default(true).optional(),
  appliesToAllProducts: z.boolean().default(true).optional(),
  appliesToCategories: z.array(z.string()).optional(),
  appliesToProducts: z.array(z.string()).optional(),
});

// --- Schema specific to 'percentage' coupons ---
const percentageCouponSchema = couponBaseFields.extend({
  type: z.literal(CouponType[0]), // 'percentage'
  value: couponBaseFields.shape.value.max(100, {
    message: "Percentage value cannot exceed 100",
  }),
  maxDiscountAmount: z.preprocess(
    // --- THIS IS THE FIX ---
    // If value is "", convert to null BEFORE coercion
    (val) => (val === "" ? null : val),
    z.coerce
      .number({ message: "Max discount must be a number" })
      .positive({ message: "Max discount must be positive" })
      .optional()
      .nullable() // Allow null
  ),
});

// --- Schema specific to 'fixed' coupons ---
const fixedCouponSchema = couponBaseFields.extend({
  type: z.literal(CouponType[1]), // 'fixed'
  // maxDiscountAmount is correctly excluded
});

// --- Discriminated Union for CREATE ---
const couponBodyUnionSchema = z.discriminatedUnion("type", [
  percentageCouponSchema,
  fixedCouponSchema,
]);

// --- Refinements for CREATE ---
const createCouponBodyBaseSchema = couponBodyUnionSchema
  .refine((data) => data.validUntil > data.validFrom, {
    message: '"Valid until" date must be after "valid from" date',
    path: ["validUntil"],
  })
  .refine(
    (data) => {
      if (data.appliesToAllProducts === false) {
        const hasCategories =
          data.appliesToCategories && data.appliesToCategories.length > 0;
        const hasProducts =
          data.appliesToProducts && data.appliesToProducts.length > 0;
        return hasCategories || hasProducts;
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
      const hasCategories =
        data.appliesToCategories && data.appliesToCategories.length > 0;
      const hasProducts =
        data.appliesToProducts && data.appliesToProducts.length > 0;
      return !(hasCategories && hasProducts);
    },
    {
      message: "Coupon can apply to categories OR products, but not both.",
      path: ["appliesToCategories"],
    }
  )
  .transform((data) => ({
    ...data,
    appliesToCategories: data.appliesToCategories ?? [],
    appliesToProducts: data.appliesToProducts ?? [],
  }));

// --- Create Schema ---
const createCouponZodSchema = z
  .object({
    body: createCouponBodyBaseSchema,
  })
  .transform((data) => ({
    body: {
      ...data.body,
      code: data.body.code.toUpperCase().trim(),
    },
  }));

// --- UPDATE SCHEMA (NEW LOGIC) ---

// 1. Define a schema that includes ALL possible fields
const updateCouponAllFields = couponBaseFields.extend({
  type: z.enum([...CouponType] as [string, ...string[]]).optional(),
  maxDiscountAmount: z.preprocess(
    // --- APPLY THE SAME FIX HERE ---
    (val) => (val === "" ? null : val),
    z.coerce
      .number({ message: "Max discount must be a number" })
      .positive({ message: "Max discount must be positive" })
      .optional()
      .nullable()
  ),
});

// 2. Create the update schema
const updateCouponZodSchema = z
  .object({
    body: updateCouponAllFields.partial(), // Make all fields optional
  })
  // 3. Add refinements
  .refine(
    (data) => {
      // Date check
      if (data.body?.validFrom && data.body?.validUntil) {
        return data.body.validUntil > data.body.validFrom;
      }
      return true;
    },
    {
      message: '"Valid until" date must be after "valid from" date',
      path: ["body", "validUntil"],
    }
  )
  .refine(
    (data) => {
      // Logic: IF type is "fixed", maxDiscountAmount must NOT be a positive number.
      if (data.body?.type === "fixed") {
        return !data.body.maxDiscountAmount || data.body.maxDiscountAmount <= 0;
      }
      return true;
    },
    {
      message: 'Fixed coupons cannot have a "max discount amount".',
      path: ["body", "maxDiscountAmount"],
    }
  )
  .refine(
    (data) => {
      // IF type is 'percentage' and value is provided, check it
      if (data.body?.type === "percentage" && data.body.value) {
        return data.body.value <= 100;
      }
      return true;
    },
    {
      message: "Percentage value cannot exceed 100.",
      path: ["body", "value"],
    }
  )
  // 4. Add transform (the comparison error is now gone)
  .transform((data) => {
    if (data.body?.code) {
      data.body.code = data.body.code.toUpperCase().trim();
    }
    return data;
  });

// --- Apply Coupon Schema --- (Remains the same)
const couponCartItemZodSchema = z.object({
  productId: z.string().min(1, { message: "Product ID is required" }),
  productSizeId: z.string().min(1, { message: "Product Size ID is required" }),
  quantity: z.coerce
    .number()
    .int()
    .positive({ message: "Quantity must be a positive integer" }),
});

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
  applyCouponZodSchema,
};

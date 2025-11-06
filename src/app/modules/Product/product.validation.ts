// src/app/modules/Product/product.validation.ts
import { z } from "zod";

// Reusable slug helper
const createSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

// Zod schema for the embedded product size
const productSizeZodSchema = z.object({
  size: z.string().min(1, { message: "Size name is required" }),
  stock: z.coerce // // Use z.coerce.number() and 'message' // --- FIX 1 --- //
    .number({
      message: "Stock must be a number",
    })
    .int()
    .min(0, { message: "Stock cannot be negative" })
    .default(0),
  priceOverride: z.coerce.number().positive().optional(),
  sku: z.string().optional(),
});

// Zod schema for creating a new product
const createProductZodSchema = z.object({
  body: z
    .object({
      title: z.string().min(1, { message: "Title is required" }),
      description: z.string().optional(),
      category: z.string().min(1, { message: "Category ID is required" }),
      basePrice: z.coerce // // Use z.coerce.number() and 'message' // --- FIX 2 --- //
        .number({
          message: "Base price is required and must be a number",
        })
        .positive({ message: "Base price must be positive" }),
      compareAtPrice: z.coerce.number().positive().optional(),
      images: z
        .array(z.string().url({ message: "Invalid image URL" }))
        .min(1, { message: "At least one image is required" }),
      sizes: z
        .array(productSizeZodSchema)
        .min(1, { message: "At least one size is required" }),
      sku: z.string().optional(),
      isActive: z.boolean().default(true),
      newArrival: z.boolean().optional().default(false),
      productOrder: z.coerce.number().int().optional().default(0),
    })
    .refine(
      (data) => {
        // Ensure compareAtPrice is greater than basePrice if it exists
        if (data.compareAtPrice) {
          return data.compareAtPrice > data.basePrice;
        }
        return true;
      },
      {
        message: '"Compare at" price must be greater than the base price.',
        path: ["compareAtPrice"],
      }
    )
    .transform((data) => {
      // Automatically create the slug from the title
      return {
        ...data,
        slug: createSlug(data.title),
      };
    }),
});

// Zod schema for updating a product (all fields are optional)
const updateProductZodSchema = z.object({
  body: z
    .object({
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      category: z.string().min(1).optional(),
      // Also apply fix here for consistency
      basePrice: z.coerce.number().positive().optional(),
      compareAtPrice: z.coerce.number().positive().optional().nullable(),
      images: z.array(z.string().url()).min(1).optional(),
      sizes: z.array(productSizeZodSchema).min(1).optional(),
      sku: z.string().optional(),
      isActive: z.boolean().optional(),
      newArrival: z.boolean().optional(),
      productOrder: z.coerce.number().int().optional(),
    })
    .transform((data) => {
      // If the title is being updated, update the slug as well
      if (data.title) {
        return {
          ...data,
          slug: createSlug(data.title),
        };
      }
      return data;
    }),
});

const applyCategoryDiscountZodSchema = z.object({
  body: z.object({
    categoryId: z.string().min(1, { message: "Category ID is required" }),
    discountType: z.enum(["percentage", "fixed"], {
      message: "Discount type is required",
    }),
    discountValue: z.coerce
      .number({ message: "Discount value is required" })
      .positive({ message: "Value must be positive" }),
  }),
});

export const ProductValidation = {
  createProductZodSchema,
  updateProductZodSchema,
  applyCategoryDiscountZodSchema,
};

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
  stock: z//
  // --- FIX 1 ---
  // Use z.coerce.number() and 'message'
  //
  .coerce
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
      basePrice: z//
      // --- FIX 2 ---
      // Use z.coerce.number() and 'message'
      //
      .coerce
        .number({
          message: "Base price is required and must be a number",
        })
        .positive({ message: "Base price must be positive" }),
      images: z
        .array(z.string().url({ message: "Invalid image URL" }))
        .min(1, { message: "At least one image is required" }),
      sizes: z
        .array(productSizeZodSchema)
        .min(1, { message: "At least one size is required" }),
      sku: z.string().optional(),
      isActive: z.boolean().default(true),
    })
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
      images: z.array(z.string().url()).min(1).optional(),
      sizes: z.array(productSizeZodSchema).min(1).optional(),
      sku: z.string().optional(),
      isActive: z.boolean().optional(),
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

export const ProductValidation = {
  createProductZodSchema,
  updateProductZodSchema,
};

// src/app/modules/Category/category.validation.ts
import { z } from "zod";

// Helper to generate a URL-friendly slug
const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Remove consecutive hyphens
};

const sizeChartZodSchema = z
  .object({
    headers: z
      .array(z.string().min(1))
      .min(1, { message: "Size chart must have at least one header." }),
    rows: z
      .array(z.array(z.string()))
      .min(1, { message: "Size chart must have at least one row." }),
  })
  .refine(
    (data) => {
      // Ensure all rows have the same number of columns as the headers
      return data.rows.every((row) => row.length === data.headers.length);
    },
    {
      message:
        "All size chart rows must have the same number of entries as the headers.",
      path: ["rows"],
    }
  )
  .optional();

const createCategoryZodSchema = z.object({
  body: z
    .object({
      //
      // --- THIS IS THE FIX ---
      //
      name: z.string().min(1, { message: "Category name is required" }),
      description: z.string().optional(),
      image: z.string().url({ message: "Invalid image URL" }).optional(),
      sizeChart: sizeChartZodSchema,
    })
    .transform((data) => {
      // Automatically create the slug from the name
      return {
        ...data,
        slug: createSlug(data.name),
      };
    }),
});

const updateCategoryZodSchema = z.object({
  body: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
      image: z.string().url({ message: "Invalid image URL" }).optional(),
      sizeChart: sizeChartZodSchema.nullable(),
    })
    .transform((data) => {
      // If the name is being updated, update the slug as well
      if (data.name) {
        return {
          ...data,
          slug: createSlug(data.name),
        };
      }
      return data;
    }),
});

export const CategoryValidation = {
  createCategoryZodSchema,
  updateCategoryZodSchema,
};

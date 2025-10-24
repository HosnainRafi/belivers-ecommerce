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

const createCategoryZodSchema = z.object({
  body: z
    .object({
      //
      // --- THIS IS THE FIX ---
      //
      name: z.string().min(1, { message: "Category name is required" }),
      description: z.string().optional(),
      image: z.string().url({ message: "Invalid image URL" }).optional(),
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

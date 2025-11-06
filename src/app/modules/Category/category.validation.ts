// src/app/modules/Category/category.validation.ts
import { z } from "zod";
import { CategoryGender } from "./category.model";

// Helper to generate a URL-friendly slug
const createSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Remove consecutive hyphens
};

// const sizeChartZodSchema = z
//   .object({
//     headers: z
//       .array(z.string().min(1))
//       .min(1, { message: "Size chart must have at least one header." }),
//     rows: z
//       .array(z.array(z.string()))
//       .min(1, { message: "Size chart must have at least one row." }),
//   })
//   .refine(
//     (data) => {
//       // Ensure all rows have the same number of columns as the headers
//       return data.rows.every((row) => row.length === data.headers.length);
//     },
//     {
//       message:
//         "All size chart rows must have the same number of entries as the headers.",
//       path: ["rows"],
//     }
//   )
//   .optional();

const sizeChartZodSchema = z
  .string()
  .url({ message: "Size chart must be a valid URL" })
  .optional()
  .nullable();

const createCategoryZodSchema = z.object({
  body: z
    .object({
      name: z.string().min(1, { message: "Category name is required" }),
      description: z.string().optional(),
      image: z.string().url({ message: "Invalid image URL" }).optional(),
      sizeChart: sizeChartZodSchema,
      parentCategory: z.string().optional().nullable(),
      order: z.coerce.number().int().optional().default(0),
      gender: z.enum([...CategoryGender] as [string, ...string[]]).optional(),
    })
    .transform((data) => ({
      ...data,
      slug: createSlug(data.name),
      // Ensure empty string becomes null for the DB default
      parentCategory: data.parentCategory === "" ? null : data.parentCategory,
    })),
});

const updateCategoryZodSchema = z.object({
  body: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
      image: z.string().url({ message: "Invalid image URL" }).optional(),
      sizeChart: sizeChartZodSchema,
      parentCategory: z.string().optional().nullable(),
      order: z.coerce.number().int().optional(),
      gender: z
        .enum([...CategoryGender] as [string, ...string[]])
        .optional()
        .nullable(),
    })
    .transform((data) => {
      const transformedData: any = { ...data };
      if (data.name) {
        transformedData.slug = createSlug(data.name);
      }
      // Handle parentCategory update explicitly
      if (data.parentCategory !== undefined) {
        transformedData.parentCategory =
          data.parentCategory === "" || data.parentCategory === null
            ? null
            : data.parentCategory;
      }
      if (data.gender !== undefined) {
        transformedData.gender = data.gender === "" ? null : data.gender;
      }

      return transformedData;
    }),
});

export const CategoryValidation = {
  createCategoryZodSchema,
  updateCategoryZodSchema,
};

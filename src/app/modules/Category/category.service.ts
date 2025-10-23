// src/app/modules/Category/category.service.ts
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { Category } from "./category.model";
import { TCategory } from "./category.interface";

const createCategoryIntoDB = async (payload: TCategory): Promise<TCategory> => {
  // Check if a category with this slug already exists
  const existingCategory = await Category.findOne({ slug: payload.slug });
  if (existingCategory) {
    throw new ApiError(
      httpStatus.CONFLICT,
      `A category with the name '${payload.name}' (slug: '${payload.slug}') already exists.`
    );
  }

  const result = await Category.create(payload);
  return result;
};

const getAllCategoriesFromDB = async (): Promise<TCategory[]> => {
  const result = await Category.find().sort({ createdAt: "desc" });
  return result;
};

const getSingleCategoryFromDB = async (
  id: string
): Promise<TCategory | null> => {
  const result = await Category.findById(id);
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found.");
  }
  return result;
};

const updateCategoryInDB = async (
  id: string,
  payload: Partial<TCategory>
): Promise<TCategory | null> => {
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found.");
  }

  const result = await Category.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};

const deleteCategoryFromDB = async (id: string): Promise<TCategory | null> => {
  // <-- FIX HERE
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found.");
  }

  // **Hard Delete**: We are deleting the category directly.
  // In a larger system, you might set an `isDeleted: true` flag instead.
  // We also need to check if any products are using this category.
  // (We'll add that check once the Product model exists)

  // TODO: Check for associated products before deleting.

  const result = await Category.findByIdAndDelete(id);
  return result;
};

export const CategoryService = {
  createCategoryIntoDB,
  getAllCategoriesFromDB,
  getSingleCategoryFromDB,
  updateCategoryInDB,
  deleteCategoryFromDB,
};

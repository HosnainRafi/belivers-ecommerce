// src/app/modules/Category/category.service.ts
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";
import { Category } from "./category.model";
import { TCategory } from "./category.interface";
import { Product } from "../Product/product.model";
import mongoose, { Document, Types } from "mongoose";

const createCategoryIntoDB = async (payload: TCategory): Promise<TCategory> => {
  // Slug check remains
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

type TCategoryNode = TCategory & {
  _id: mongoose.Types.ObjectId; // Ensure _id is present
  children?: TCategoryNode[];
};

const buildCategoryTree = (
  categories: (Document<unknown, {}, TCategory> & TCategory)[]
): TCategoryNode[] => {
  const categoryMap: { [key: string]: TCategoryNode } = {};
  const rootCategories: TCategoryNode[] = [];

  // First pass: Create map and identify root categories
  categories.forEach((category) => {
    // --- FIX 2: Call .toObject() on the Mongoose document ---
    const catPlainObject = category.toObject();
    const catWithChildren: TCategoryNode = { ...catPlainObject, children: [] };
    // Ensure _id is treated as a mongoose ObjectId before calling toString()
    const id = (category._id as mongoose.Types.ObjectId).toString();
    categoryMap[id] = catWithChildren;

    if (!category.parentCategory) {
      rootCategories.push(catWithChildren);
    }
  });

  // Second pass: Link children to their parents
  categories.forEach((category) => {
    if (category.parentCategory) {
      const parentId = (
        category.parentCategory as mongoose.Types.ObjectId
      ).toString();
      const parent = categoryMap[parentId];
      if (parent) {
        parent.children = parent.children || [];
        // Use a typed _id here as well
        const currentCategoryMapped =
          categoryMap[(category._id as mongoose.Types.ObjectId).toString()];
        if (currentCategoryMapped) {
          parent.children.push(currentCategoryMapped);
        }
      }
    }
  });

  const pruneEmptyChildren = (nodes: TCategoryNode[]) => {
    nodes.forEach((node) => {
      if (node.children && node.children.length > 0) {
        pruneEmptyChildren(node.children);
      } else {
        delete node.children;
      }
    });
  };

  pruneEmptyChildren(rootCategories);

  return rootCategories;
};

const getAllCategoriesFromDB = async (): Promise<TCategoryNode[]> => {
  const allCategories = await Category.find().sort({ order: 1, name: 1 });
  const categoryTree = buildCategoryTree(allCategories);
  return categoryTree;
};

const getSingleCategoryFromDB = async (
  id: string
): Promise<TCategory | null> => {
  // Populate parent category for context when viewing a single category
  const result = await Category.findById(id).populate("parentCategory");
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

  // Parent validation will be handled by the pre-save hook if parentCategory is in payload

  // Use findByIdAndUpdate, hooks won't run by default.
  // If you need hooks (like parent validation), fetch, update, and save:
  // Object.assign(category, payload);
  // await category.save(); // This will trigger the pre-save hook
  // return category;

  // OR trust validation layer and update directly:
  const result = await Category.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true, // Runs basic schema validators, but not pre('save') hooks
  }).populate("parentCategory"); // Populate parent after update
  return result;
};

const getAllSubcategoriesFromDB = async (): Promise<TCategory[]> => {
  const subcategories = await Category.find({
    parentCategory: { $ne: null },
  })
    .populate("parentCategory", "name slug") // Populate parent's name for context
    .sort({ order: 1, name: "asc" });

  return subcategories;
};

const getSubcategoriesByParentId = async (
  parentId: string
): Promise<TCategory[]> => {
  // Validate if the provided ID is a valid ObjectId
  if (!Types.ObjectId.isValid(parentId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid parent category ID.");
  }

  const subcategories = await Category.find({ parentCategory: parentId }).sort({
    order: 1,
    name: "asc",
  });

  // You could optionally check if the parent category itself exists first,
  // but finding an empty array is also a valid response if the parent has no children or doesn't exist.

  return subcategories;
};

// --- MODIFIED FUNCTION ---
const deleteCategoryFromDB = async (id: string): Promise<TCategory | null> => {
  const category = await Category.findById(id);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found.");
  }

  // 1. Check if any products use this category
  const productCount = await Product.countDocuments({ category: id });
  if (productCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete category: ${productCount} product(s) are associated with it.`
    );
  }

  // 2. Check if this category is a parent to any other categories
  const childCount = await Category.countDocuments({ parentCategory: id });
  if (childCount > 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot delete category: It has ${childCount} sub-category(ies). Please delete or reassign them first.`
    );
  }

  // If checks pass, proceed with deletion
  const result = await Category.findByIdAndDelete(id);
  return result;
};

export const CategoryService = {
  createCategoryIntoDB,
  getAllCategoriesFromDB,
  getSingleCategoryFromDB,
  updateCategoryInDB,
  getSubcategoriesByParentId,
  deleteCategoryFromDB,
  getAllSubcategoriesFromDB,
};

// src/app/modules/Product/product.service.ts
import httpStatus from "http-status";
import { SortOrder, Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { IGenericResponse } from "../../../interfaces/common";
import calculatePagination from "../../../shared/calculatePagination";
import { Product } from "./product.model";
import { TProduct } from "./product.interface";
import { Category } from "../Category/category.model";
import mongoose from "mongoose";

// --- Create Product ---
const createProductIntoDB = async (payload: TProduct): Promise<TProduct> => {
  // The pre-save hook in the model handles slug and category validation
  const result = await Product.create(payload);
  return result;
};

// --- Get All Products (with Pagination, Filtering, Sorting) ---
type TProductFilters = {
  searchTerm?: string;
  category?: string; // This will be a category *slug*
  size?: string;
  minPrice?: string;
  maxPrice?: string;
  isActive?: string;
};

const getAllProductsFromDB = async (
  filters: TProductFilters,
  options: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: SortOrder;
  }
): Promise<IGenericResponse<TProduct[]>> => {
  const { searchTerm, category, size, minPrice, maxPrice, isActive } = filters;
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  const andConditions = [];

  // Search filter
  if (searchTerm) {
    andConditions.push({
      $or: [
        { title: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
        { sku: { $regex: searchTerm, $options: "i" } },
      ],
    });
  }

  // Category filter (by slug)
  if (category) {
    const categoryDoc = await Category.findOne({ slug: category });
    if (categoryDoc) {
      andConditions.push({ category: categoryDoc._id });
    } else {
      // If category slug is invalid, return no results
      return { meta: { page, limit, total: 0 }, data: [] };
    }
  }

  // Size filter
  if (size) {
    andConditions.push({
      "sizes.size": { $regex: `^${size}$`, $options: "i" },
    });
  }

  // Price filter
  if (minPrice || maxPrice) {
    const priceFilter: { $gte?: number; $lte?: number } = {};
    if (minPrice) priceFilter.$gte = Number(minPrice);
    if (maxPrice) priceFilter.$lte = Number(maxPrice);
    andConditions.push({ basePrice: priceFilter });
  }

  // Status filter (only show active by default for customers)
  if (isActive === "true" || isActive === "false") {
    andConditions.push({ isActive: isActive === "true" });
  } else {
    // Default for public view: only show active products
    andConditions.push({ isActive: true });
  }

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const result = await Product.find(whereConditions)
    .populate("category") // Populate the category details
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(whereConditions);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

// --- Get Single Product (by Slug or ID) ---
const getSingleProductFromDB = async (
  idOrSlug: string
): Promise<TProduct | null> => {
  let product;
  // Check if the identifier is a valid ObjectId
  if (Types.ObjectId.isValid(idOrSlug)) {
    product = await Product.findById(idOrSlug).populate("category");
  }

  // If not found by ID, try finding by slug
  if (!product) {
    product = await Product.findOne({ slug: idOrSlug }).populate("category");
  }

  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");
  }

  // Optional: For public view, only show if active
  // if (!product.isActive) {
  //   throw new ApiError(httpStatus.NOT_FOUND, 'Product not found.');
  // }

  return product;
};

// --- Update Product ---
const updateProductInDB = async (
  id: string,
  payload: Partial<TProduct>
): Promise<TProduct | null> => {
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");
  }

  const result = await Product.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate("category");

  return result;
};

// --- Delete Product (Soft Delete) ---
// We will set isActive to false instead of hard deleting
const deleteProductFromDB = async (id: string): Promise<TProduct | null> => {
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");
  }

  // Soft delete by setting isActive to false
  product.isActive = false;
  await product.save();

  // Or, for a hard delete:
  // const result = await Product.findByIdAndDelete(id);
  // return result;

  return product;
};

type TDiscountPayload = {
  categoryId: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
};

const applyCategoryDiscountToDB = async (
  payload: TDiscountPayload
): Promise<{ modifiedCount: number }> => {
  const { categoryId, discountType, discountValue } = payload;

  // 1. Check if category exists
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found.");
  }

  // 2. Find all active products in this category
  const products = await Product.find({
    category: new mongoose.Types.ObjectId(categoryId),
    isActive: true,
  });

  if (products.length === 0) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "No active products found in this category."
    );
  }

  // 3. Prepare bulk update operations
  const bulkOps = products.map((product) => {
    // Set the current price as the "compare at" price
    // Note: If a compareAtPrice already exists, this will overwrite it.
    // An alternative is to use `product.compareAtPrice || product.basePrice`
    const oldPrice = product.basePrice;
    let newPrice = 0;

    if (discountType === "percentage") {
      if (discountValue >= 100) {
        throw new ApiError(
          httpStatus.BAD_REQUEST,
          "Percentage discount must be less than 100."
        );
      }
      newPrice = oldPrice * (1 - discountValue / 100);
    } else {
      // Fixed discount
      newPrice = oldPrice - discountValue;
    }

    // Ensure price doesn't go below 0
    newPrice = Math.max(0, newPrice);
    // Round to 2 decimal places (or 0 for whole currency)
    newPrice = parseFloat(newPrice.toFixed(2));

    return {
      updateOne: {
        filter: { _id: product._id },
        update: {
          $set: {
            basePrice: newPrice,
            compareAtPrice: oldPrice,
          },
        },
      },
    };
  });

  // 4. Execute the bulk write
  const result = await Product.bulkWrite(bulkOps);

  return {
    modifiedCount: result.modifiedCount,
  };
};

export const ProductService = {
  createProductIntoDB,
  getAllProductsFromDB,
  getSingleProductFromDB,
  updateProductInDB,
  deleteProductFromDB,
  applyCategoryDiscountToDB,
};

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
import { Review } from "../Review/review.model";
import { Order } from "../Order/order.model";
import { TCategoryGender } from "../Category/category.interface";

// --- Create Product ---
const createProductIntoDB = async (payload: TProduct): Promise<TProduct> => {
  // The pre-save hook in the model handles slug and category validation
  const result = await Product.create(payload);
  return result;
};

// --- Get All Products (with Pagination, Filtering, Sorting) ---
type TProductFilters = {
  searchTerm?: string;
  category?: string;
  size?: string;
  minPrice?: string;
  maxPrice?: string;
  isActive?: string;
  newArrival?: string;
  gender?: TCategoryGender;
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
  const {
    searchTerm,
    category,
    size,
    minPrice,
    maxPrice,
    isActive,
    newArrival,
    gender,
  } = filters;
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  const andConditions = [];

  // Search filter
  if (searchTerm) {
    andConditions.push({
      $or: [
        { title: { $regex: searchTerm, $options: "i" } },
        { sku: { $regex: searchTerm, $options: "i" } },
      ],
    });
  }

  // Category filter (by slug)
  // if (category) {
  //   const categoryDoc = await Category.findOne({ slug: category });
  //   if (categoryDoc) {
  //     // Find products in this category OR any of its subcategories
  //     const categoriesToSearch = [categoryDoc._id];
  //     const subcategories = await Category.find({
  //       parentCategory: categoryDoc._id,
  //     });
  //     subcategories.forEach((sub) => categoriesToSearch.push(sub._id));

  //     andConditions.push({ category: { $in: categoriesToSearch } });
  //   } else {
  //     // Category slug is invalid, return no products
  //     return { meta: { page: 1, limit, total: 0 }, data: [] };
  //   }
  // }

  //new update

  let categoryIdsToSearch: Types.ObjectId[] = [];
  // Filter 1: By Category Slug (e.g., /products?category=t-shirts)
  if (category) {
    const categoryDoc = await Category.findOne({ slug: category });
    if (categoryDoc) {
      categoryIdsToSearch.push(categoryDoc._id);
      const subcategories = await Category.find({
        parentCategory: categoryDoc._id,
      });
      subcategories.forEach((sub) => categoryIdsToSearch.push(sub._id));
    }
  }

  // Filter 2: By Gender (e.g., /products?gender=Men)
  if (gender) {
    // Find all categories matching that gender
    const genderCategories = await Category.find(
      { gender: gender },
      { _id: 1 }
    );
    const genderCategoryIds = genderCategories.map((cat) => cat._id);

    if (categoryIdsToSearch.length > 0) {
      // INTERSECTION: User wants products from a specific category AND gender
      // We only keep IDs that are in *both* lists
      categoryIdsToSearch = categoryIdsToSearch.filter((id) =>
        genderCategoryIds.some((genderId) => genderId.equals(id))
      );
    } else {
      // User is *only* filtering by gender
      categoryIdsToSearch = genderCategoryIds;
    }

    // If no categories match the gender, return empty
    if (categoryIdsToSearch.length === 0 && !category) {
      return { meta: { page: 1, limit, total: 0 }, data: [] };
    }
  }

  // Add the final category filter condition
  if (categoryIdsToSearch.length > 0) {
    andConditions.push({ category: { $in: categoryIdsToSearch } });
  }

  //end updated category filter

  // Size filter
  if (size) {
    andConditions.push({ "sizes.size": size, "sizes.stock": { $gt: 0 } });
  }

  // Price filter
  if (minPrice) {
    andConditions.push({ basePrice: { $gte: Number(minPrice) } });
  }
  if (maxPrice) {
    andConditions.push({ basePrice: { $lte: Number(maxPrice) } });
  }

  // Activity filter
  andConditions.push({
    isActive: isActive === "false" ? false : true,
    deleted: { $ne: true }, // Always hide 'deleted' products
  });

  if (newArrival === "true") {
    andConditions.push({ newArrival: true });
  }

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};

  const result = await Product.find(whereConditions)
    .populate("category") // <-- MODIFICATION: Populate the category
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(whereConditions);

  return {
    meta: { page, limit, total },
    data: result,
  };
};

const getSingleProductFromDB = async (
  idOrSlug: string
): Promise<TProduct | null> => {
  let product;
  if (Types.ObjectId.isValid(idOrSlug)) {
    product = await Product.findById(idOrSlug).populate("category"); // <-- MODIFICATION
  }

  if (!product) {
    product = await Product.findOne({ slug: idOrSlug }).populate("category"); // <-- MODIFICATION
  }

  if (!product || product.deleted) {
    // Hide if deleted
    throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");
  }

  // Now, product.category will be an object, not just an ID
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

const deleteProductFromDB = async (id: string): Promise<TProduct | null> => {
  const result = await Product.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");
  }
  return result;
};

// --- MODIFIED HARD DELETE FUNCTION ---
const hardDeleteProductFromDB = async (
  id: string
): Promise<{
  deleted: boolean;
  message: string;
  product: TProduct | null;
}> => {
  // 1. Check if product exists
  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, "Product not found.");
  }

  // 2. Check if product exists in any Orders
  const orderCount = await Order.countDocuments({ "items.productId": id });

  // 3. DECISION: Hard delete or Soft delete with 'deleted' flag?
  if (orderCount > 0) {
    // --- Perform SOFT DELETE with DELETED flag ---
    // Check if it's already marked
    if (!product.isActive && product.deleted) {
      return {
        deleted: true, // Report as deleted
        message:
          "Product is associated with orders and was already marked as deleted (inactive). No action taken.",
        product: product,
      };
    }
    // Set inactive AND deleted: true
    const softDeletedProduct = await Product.findByIdAndUpdate(
      id,
      { isActive: false, deleted: true }, // <-- SET BOTH FLAGS
      { new: true }
    );
    return {
      deleted: true, // Report as deleted
      message:
        "Product is associated with orders. Marked as deleted (set inactive and deleted flag) instead of permanent deletion.",
      product: softDeletedProduct,
    };
  } else {
    // --- Proceed with HARD DELETE ---
    // a. Delete associated reviews
    await Review.deleteMany({ product: id });

    // b. Perform hard delete
    const hardDeletedProduct = await Product.findByIdAndDelete(id);

    if (!hardDeletedProduct) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to delete product after checks."
      );
    }

    return {
      deleted: true, // Report as deleted
      message:
        "Product permanently deleted successfully (including associated reviews).",
      product: hardDeletedProduct,
    };
  }
};

export const ProductService = {
  createProductIntoDB,
  getAllProductsFromDB,
  getSingleProductFromDB,
  updateProductInDB,
  deleteProductFromDB,
  applyCategoryDiscountToDB,
  hardDeleteProductFromDB,
};

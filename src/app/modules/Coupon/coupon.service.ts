// src/app/modules/Coupon/coupon.service.ts
import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { TCoupon, TCouponCartItem } from "./coupon.interface";
import { Coupon } from "./coupon.model";
import { Product } from "../Product/product.model";
import { TProductSize } from "../Product/product.interface";

// --- Create Coupon (Admin) ---
const createCouponIntoDB = async (
  adminId: string,
  payload: Omit<TCoupon, "createdBy" | "usedCount">
): Promise<TCoupon> => {
  const result = await Coupon.create({
    ...payload,
    createdBy: new Types.ObjectId(adminId), // Attach the admin's ID
  });
  return result;
};

// --- Get All Coupons (Admin) ---
const getAllCouponsFromDB = async (): Promise<TCoupon[]> => {
  const result = await Coupon.find().populate("createdBy", "name email");
  return result;
};

// --- Get Single Coupon (Admin) ---
const getSingleCouponFromDB = async (id: string): Promise<TCoupon | null> => {
  const result = await Coupon.findById(id).populate("createdBy", "name email");
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Coupon not found.");
  }
  return result;
};

// --- Update Coupon (Admin) ---
const updateCouponInDB = async (
  id: string,
  payload: Partial<TCoupon>
): Promise<TCoupon | null> => {
  const result = await Coupon.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate("createdBy", "name email");

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Coupon not found.");
  }
  return result;
};

// --- Delete Coupon (Admin) ---
const deleteCouponFromDB = async (id: string): Promise<TCoupon | null> => {
  // We'll hard delete coupons.
  // Alternatively, you could set isActive = false
  const result = await Coupon.findByIdAndDelete(id);
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Coupon not found.");
  }
  return result;
};

// --- Validate & Apply Coupon (Public/Order) ---
export type TCouponValidationResponse = {
  isValid: boolean;
  discountAmount: number;
  message: string;
  coupon?: TCoupon;
};

// --- THIS FUNCTION IS REWRITTEN ---
const validateAndApplyCoupon = async (
  code: string,
  items: TCouponCartItem[]
): Promise<TCouponValidationResponse> => {
  const response = (
    isValid: boolean,
    discountAmount: number,
    message: string,
    coupon?: TCoupon
  ): TCouponValidationResponse => ({
    isValid,
    discountAmount,
    message,
    coupon,
  });

  // --- 1. Find the coupon ---
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });
  if (!coupon) {
    return response(false, 0, "Invalid coupon code.");
  }

  // --- 2. Check basic validity (active, date, usage) ---
  if (!coupon.isActive) {
    return response(false, 0, "This coupon is no longer active.");
  }
  const now = new Date();
  if (coupon.validUntil < now) {
    return response(false, 0, "This coupon has expired.");
  }
  if (coupon.validFrom > now) {
    return response(false, 0, "This coupon is not yet valid.");
  }
  if (coupon.usedCount >= coupon.usageLimit) {
    return response(false, 0, "This coupon has reached its usage limit.");
  }

  // --- 3. Get product data for all items in the cart ---
  const productIds = items.map((item) => item.productId);
  const productsFromDB = await Product.find({ _id: { $in: productIds } });

  let cartSubtotal = 0;
  let eligibleTotal = 0;

  // --- 4. Calculate totals and check eligibility ---
  for (const item of items) {
    const product = productsFromDB.find(
      (p) => p._id.toString() === item.productId
    );
    if (!product) continue; // Skip if product not found (shouldn't happen)

    const size = product.sizes.find(
      (s) => s._id?.toString() === item.productSizeId
    );
    if (!size) continue; // Skip if size not found

    const itemPrice = size.priceOverride ?? product.basePrice;
    const itemTotal = itemPrice * item.quantity;
    cartSubtotal += itemTotal;

    // --- 4b. *** THIS IS THE MODIFIED LOGIC *** ---
    if (coupon.appliesToAllProducts) {
      eligibleTotal += itemTotal;
    } else if (coupon.appliesToCategories.length > 0) {
      // Check if the product's category is in the coupon's list
      const isCategoryMatch = coupon.appliesToCategories.some(
        (categoryId) => categoryId.toString() === product.category.toString()
      );
      if (isCategoryMatch) {
        eligibleTotal += itemTotal;
      }
    } else if (coupon.appliesToProducts.length > 0) {
      // Check if the product's ID is in the coupon's list
      const isProductMatch = coupon.appliesToProducts.some(
        (productId) => productId.toString() === product._id.toString()
      );
      if (isProductMatch) {
        eligibleTotal += itemTotal;
      }
    }
    // --- END OF MODIFIED LOGIC ---
  }

  // --- 5. Check order minimum ---
  if (coupon.minOrderAmount && cartSubtotal < coupon.minOrderAmount) {
    return response(
      false,
      0,
      `Minimum order of ${coupon.minOrderAmount} BDT required.`
    );
  }

  // If no items were eligible, coupon is invalid for this cart
  if (eligibleTotal === 0 && !coupon.appliesToAllProducts) {
    return response(
      false,
      0,
      "This coupon is not valid for the items in your cart."
    );
  }

  // --- 6. All checks passed, calculate discount ---
  // The discount is applied ONLY to the eligibleTotal
  let discountAmount = 0;

  if (coupon.type === "fixed") {
    discountAmount = coupon.value;
    // Ensure discount doesn't exceed the total of eligible items
    if (discountAmount > eligibleTotal) {
      discountAmount = eligibleTotal;
    }
  } else if (coupon.type === "percentage") {
    discountAmount = (eligibleTotal * coupon.value) / 100;

    // Check for max discount cap
    if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
    }
    // Ensure discount doesn't exceed the total of eligible items
    if (discountAmount > eligibleTotal) {
      discountAmount = eligibleTotal;
    }
  }

  return response(
    true,
    parseFloat(discountAmount.toFixed(2)),
    "Coupon applied successfully!",
    coupon
  );
};
export const CouponService = {
  createCouponIntoDB,
  getAllCouponsFromDB,
  getSingleCouponFromDB,
  updateCouponInDB,
  deleteCouponFromDB,
  validateAndApplyCoupon,
};

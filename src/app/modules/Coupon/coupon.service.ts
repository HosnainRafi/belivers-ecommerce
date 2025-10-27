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
  cartItems: TCouponCartItem[]
): Promise<TCouponValidationResponse> => {
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });

  // 1. Check if coupon exists
  if (!coupon) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invalid coupon code.");
  }

  const response = (isValid: boolean, discount: number, message: string) => ({
    isValid,
    discountAmount: discount,
    message,
    coupon: isValid ? coupon : undefined,
  });

  // 2. Fetch products from DB to get verified prices and categories
  const productIds = cartItems.map((item) => item.productId);
  const productsFromDB = await Product.find({ _id: { $in: productIds } });

  let orderTotal = 0;
  let eligibleTotal = 0; // Total of items this coupon applies to

  for (const item of cartItems) {
    const product = productsFromDB.find(
      (p) => p._id.toString() === item.productId
    );
    // Skip if product not found or is inactive
    if (!product || !product.isActive) continue;

    const size = product.sizes.find(
      (s: TProductSize) => s._id?.toString() === item.productSizeId
    );
    // Skip if size is invalid
    if (!size) continue;

    const unitPrice = size.priceOverride ?? product.basePrice;
    const itemTotal = unitPrice * item.quantity;
    orderTotal += itemTotal; // Add to overall total

    // 3. Check if this item is eligible for the discount
    let isEligible = false;
    if (coupon.appliesToAllProducts) {
      isEligible = true;
    } else if (coupon.appliesToCategories.length > 0) {
      // Check if product's category is in the coupon's category list
      if (
        coupon.appliesToCategories.some(
          (catId) => catId.toString() === product.category.toString()
        )
      ) {
        isEligible = true;
      }
    } else if (coupon.appliesToProducts.length > 0) {
      // Check if product's ID is in the coupon's product list
      if (
        coupon.appliesToProducts.some(
          (prodId) => prodId.toString() === product._id.toString()
        )
      ) {
        isEligible = true;
      }
    }

    if (isEligible) {
      eligibleTotal += itemTotal;
    }
  }

  // --- 4. Run all validation checks ---
  const now = new Date();
  if (!coupon.isActive) {
    return response(false, 0, "This coupon is not active.");
  }
  if (coupon.validUntil < now) {
    return response(false, 0, "This coupon has expired.");
  }
  if (coupon.validFrom > now) {
    return response(false, 0, "This coupon is not yet valid.");
  }
  if (coupon.usedCount >= coupon.usageLimit) {
    return response(false, 0, "This coupon has reached its usage limit.");
  }
  // Check minOrderAmount against the *total* order, not just eligible items
  if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
    return response(
      false,
      0,
      `Minimum order of $${coupon.minOrderAmount} required.`
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

  // --- 5. All checks passed, calculate discount ---
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
    "Coupon applied successfully!"
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

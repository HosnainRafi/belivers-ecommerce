// src/app/modules/Coupon/coupon.service.ts
import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { TCoupon } from "./coupon.interface";
import { Coupon } from "./coupon.model";

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

const validateAndApplyCoupon = async (
  code: string,
  orderTotal: number
): Promise<TCouponValidationResponse> => {
  const coupon = await Coupon.findOne({ code: code.toUpperCase() });

  // 1. Check if coupon exists
  if (!coupon) {
    throw new ApiError(httpStatus.NOT_FOUND, "Invalid coupon code.");
  }

  const now = new Date();
  const response = (isValid: boolean, discount: number, message: string) => ({
    isValid,
    discountAmount: discount,
    message,
    coupon: isValid ? coupon : undefined,
  });

  // 2. Check if active
  if (!coupon.isActive) {
    return response(false, 0, "This coupon is not active.");
  }
  // 3. Check if expired (validUntil)
  if (coupon.validUntil < now) {
    return response(false, 0, "This coupon has expired.");
  }
  // 4. Check if not yet valid (validFrom)
  if (coupon.validFrom > now) {
    return response(false, 0, "This coupon is not yet valid.");
  }
  // 5. Check usage limit
  if (coupon.usedCount >= coupon.usageLimit) {
    return response(false, 0, "This coupon has reached its usage limit.");
  }
  // 6. Check minimum order amount
  if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
    return response(
      false,
      0,
      `Minimum order of $${coupon.minOrderAmount} required.`
    );
  }

  // --- All checks passed, calculate discount ---
  let discountAmount = 0;

  if (coupon.type === "fixed") {
    discountAmount = coupon.value;
    // Ensure discount doesn't exceed order total
    if (discountAmount > orderTotal) {
      discountAmount = orderTotal;
    }
  } else if (coupon.type === "percentage") {
    discountAmount = (orderTotal * coupon.value) / 100;

    // Check for max discount cap
    if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
    }
    // Ensure discount doesn't exceed order total
    if (discountAmount > orderTotal) {
      discountAmount = orderTotal;
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

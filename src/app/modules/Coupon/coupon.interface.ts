// src/app/modules/Coupon/coupon.interface.ts
import { Types } from "mongoose";

export type TCouponType = "percentage" | "fixed";

export type TCoupon = {
  _id?: Types.ObjectId; // <-- ADD THIS LINE
  code: string;
  description?: string;
  type: TCouponType;
  value: number; // The discount value (e.g., 20 for 20% or 20 for $20)
  minOrderAmount?: number;
  maxDiscountAmount?: number; // For percentage coupons, a cap on the discount
  usageLimit: number; // Total times the coupon can be used
  usedCount: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  createdBy: Types.ObjectId; // Ref to Admin
};

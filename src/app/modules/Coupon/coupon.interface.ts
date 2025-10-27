// src/app/modules/Coupon/coupon.interface.ts
import { Types } from "mongoose";

export type TCouponType = "percentage" | "fixed";

export type TCoupon = {
  _id?: Types.ObjectId;
  code: string;
  description?: string;
  type: TCouponType;
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit: number;
  usedCount: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  createdBy: Types.ObjectId; // Ref to Admin

  appliesToAllProducts: boolean;
  appliesToCategories: Types.ObjectId[]; // Ref to 'Category'
  appliesToProducts: Types.ObjectId[]; // Ref to 'Product'
};

// This represents the items sent from the client's cart
export type TCouponCartItem = {
  productId: string;
  productSizeId: string;
  quantity: number;
};

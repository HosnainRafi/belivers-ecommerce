// src/app/modules/Order/order.interface.ts
import { Types } from "mongoose";
import { OrderStatus, PaymentStatus } from "./order.constants";

// --- Embedded Documents ---

// Customer shipping/billing info (embedded in the order)
export type TShippingAddress = {
  customerName: string;
  mobile: string;
  district: string;
  addressLine: string;
  postalCode?: string;
};

// Snapshot of the item ordered (embedded in the order)
export type TOrderItem = {
  productId: Types.ObjectId;
  productSizeId: Types.ObjectId; // ID of the specific size from product.sizes array
  title: string; // Snapshot of product title
  size: string; // Snapshot of product size
  image: string; // Snapshot of product image
  quantity: number;
  unitPrice: number; // The price at the time of order
  totalPrice: number;
};

// For tracking order status changes (embedded in the order)
export type TOrderStatusHistory = {
  status: (typeof OrderStatus)[number];
  note?: string;
  changedBy?: Types.ObjectId; // Ref to Admin
  changedAt: Date;
};

// --- Main Order Interface ---
export type TOrder = {
  trackingNumber: string;
  shippingAddress: TShippingAddress;
  items: TOrderItem[];
  orderNote?: string;
  subtotal: number;
  shipping: number; // Shipping cost (can be 0)
  couponId?: Types.ObjectId; // Ref to Coupon
  discountAmount: number;
  totalAmount: number; // subtotal + shipping - discount
  paymentStatus: (typeof PaymentStatus)[number];
  status: (typeof OrderStatus)[number];
  statusHistory: TOrderStatusHistory[];
};

// --- For Zod Validation ---
export type TOrderInputItem = {
  productId: string;
  productSizeId: string; // The _id of the size sub-document
  quantity: number;
};

export type TCreateOrderPayload = {
  shippingAddress: TShippingAddress;
  items: TOrderInputItem[];
  orderNote?: string;
  shipping?: number;
  couponCode?: string;
};

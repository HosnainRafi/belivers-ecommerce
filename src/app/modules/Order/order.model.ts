// src/app/modules/Order/order.model.ts
import { Schema, model } from "mongoose";
import {
  TOrder,
  TOrderItem,
  TOrderStatusHistory,
  TShippingAddress,
} from "./order.interface";
import { OrderStatus, PaymentStatus } from "./order.constants";

// --- Embedded Schemas ---
const shippingAddressSchema = new Schema<TShippingAddress>(
  {
    customerName: { type: String, required: true },
    mobile: { type: String, required: true },
    district: { type: String, required: true },
    addressLine: { type: String, required: true },
    postalCode: { type: String },
  },
  { _id: false }
);

const orderItemSchema = new Schema<TOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productSizeId: { type: Schema.Types.ObjectId, required: true },
    title: { type: String, required: true },
    size: { type: String, required: true },
    image: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderStatusHistorySchema = new Schema<TOrderStatusHistory>(
  {
    status: { type: String, enum: OrderStatus, required: true },
    note: { type: String },
    changedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// --- Main Order Schema ---
const orderSchema = new Schema<TOrder>(
  {
    trackingNumber: {
      type: String,
      required: true,
      unique: true,
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
    },
    orderNote: {
      type: String,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    shipping: {
      type: Number,
      required: true,
      default: 0,
    },
    couponId: {
      type: Schema.Types.ObjectId,
      ref: "Coupon",
    },
    discountAmount: {
      type: Number,
      required: true,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: PaymentStatus,
      default: "pending",
    },
    status: {
      type: String,
      enum: OrderStatus,
      default: "pending",
    },
    statusHistory: {
      type: [orderStatusHistorySchema],
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: {
      virtuals: true,
    },
  }
);

// Pre-save hook to add the initial 'pending' status to history
orderSchema.pre("save", function (next) {
  if (this.isNew) {
    this.statusHistory.push({
      status: "pending",
      note: "Order placed by customer.",
      changedAt: new Date(),
    });
  }
  next();
});

export const Order = model<TOrder>("Order", orderSchema);

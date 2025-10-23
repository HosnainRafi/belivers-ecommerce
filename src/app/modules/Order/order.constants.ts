// src/app/modules/Order/order.constants.ts
export const ORDER_STATUS = {
  pending: "pending", // Order placed, awaiting confirmation
  confirmed: "confirmed", // Admin confirmed the order
  shipped: "shipped", // Order handed over to delivery
  delivered: "delivered", // Customer received the order
  cancelled: "cancelled", // Order cancelled
  refunded: "refunded", // Order refunded
} as const;

export const OrderStatus = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
];

export const PAYMENT_STATUS = {
  pending: "pending",
  paid: "paid", // For now, this will be set on 'delivered' or 'confirmed'
  failed: "failed",
} as const;

export const PaymentStatus = ["pending", "paid", "failed"];

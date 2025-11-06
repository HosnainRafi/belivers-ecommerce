// src/app/modules/Order/order.validation.ts
import { z } from "zod";
import { OrderStatus, PaymentStatus } from "./order.constants";

// Zod schema for the customer's shipping info
const shippingAddressZodSchema = z.object({
  customerName: z.string().min(1, { message: "Customer name is required" }),
  mobile: z.string().min(1, { message: "Mobile number is required" }),
  district: z.string().min(1, { message: "District is required" }),
  upazila: z.string().min(1, { message: "Upazila is required" }),
  addressLine: z.string().min(1, { message: "Address is required" }),
  postalCode: z.string().optional(),
});

// Zod schema for the items in the cart
const orderItemZodSchema = z.object({
  productId: z.string().min(1, { message: "Product ID is required" }),
  productSizeId: z.string().min(1, { message: "Product Size ID is required" }),
  quantity: z.coerce
    .number()
    .int()
    .positive({ message: "Quantity must be a positive integer" }),
});

// Zod schema for creating a new order (public)
const createOrderZodSchema = z.object({
  body: z.object({
    shippingAddress: shippingAddressZodSchema,
    items: z
      .array(orderItemZodSchema)
      .min(1, { message: "Order must contain at least one item" }),
    orderNote: z.string().optional(),
    shipping: z.coerce.number().min(0).default(0).optional(),
    couponCode: z
      .string()
      .trim()
      .toUpperCase()
      .optional()
      .refine((val) => (val ? val.length > 0 : true), {
        message: "Coupon code cannot be empty if provided",
      }),
  }),
});

// Zod schema for updating an order's status (admin)
const updateOrderStatusZodSchema = z.object({
  body: z.object({
    status: z.enum([...OrderStatus] as [string, ...string[]], {
      message: "Invalid order status",
    }),
    paymentStatus: z
      .enum([...PaymentStatus] as [string, ...string[]], {
        message: "Invalid payment status",
      })
      .optional(),
    note: z.string().optional(),
  }),
});

const trackOrderZodSchema = z.object({
  body: z
    .object({
      trackingNumber: z.string().optional(),
      mobile: z.string().optional(),
    })
    .refine((data) => data.trackingNumber || data.mobile, {
      message: "Either tracking number or mobile number is required",
      path: ["trackingNumber"], // Can point to either field
    }),
});

export const OrderValidation = {
  createOrderZodSchema,
  updateOrderStatusZodSchema,
  trackOrderZodSchema,
};

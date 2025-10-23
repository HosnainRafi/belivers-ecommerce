// src/app/modules/Order/order.service.ts
import httpStatus from "http-status";
import mongoose, { SortOrder } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { IGenericResponse } from "../../../interfaces/common";
import calculatePagination from "../../../shared/calculatePagination";
import { Coupon } from "../Coupon/coupon.model";
import {
  CouponService,
  TCouponValidationResponse,
} from "../Coupon/coupon.service";
import { Product } from "../Product/product.model";
// TProduct, TProductSize are not used directly, so they can be removed if you like
// import { TProduct, TProductSize } from '../Product/product.interface';
import { TCreateOrderPayload, TOrder, TOrderItem } from "./order.interface";
import { Order } from "./order.model";
import { generateTrackingNumber } from "./order.utils";
//
// --- FIX 1: Import OrderStatus ---
//
import { PaymentStatus, OrderStatus } from "./order.constants";

// --- Create Order (Public) ---
const createOrderIntoDB = async (
  payload: TCreateOrderPayload
): Promise<TOrder> => {
  const {
    items,
    shippingAddress,
    couponCode,
    shipping = 0,
    orderNote,
  } = payload;

  // 1. Prepare product validation
  const productIds = items.map((item) => item.productId);
  const productsFromDB = await Product.find({ _id: { $in: productIds } });

  let subtotal = 0;
  const processedItems: TOrderItem[] = [];
  const stockUpdates: {
    productId: string;
    sizeId: string;
    quantity: number;
  }[] = [];

  // 2. Validate items and calculate subtotal
  for (const item of items) {
    const product = productsFromDB.find(
      (p) => p._id.toString() === item.productId
    );

    if (!product) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Product with ID ${item.productId} not found.`
      );
    }
    if (!product.isActive) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Product "${product.title}" is currently unavailable.`
      );
    }

    const size = product.sizes.find(
      // Errors 1, 2, 3 are fixed by changes in product.interface.ts
      (s) => s._id?.toString() === item.productSizeId
    );

    if (!size) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Invalid size ID ${item.productSizeId} for product "${product.title}".`
      );
    }

    if (size.stock < item.quantity) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Not enough stock for ${product.title} (Size: ${size.size}). Available: ${size.stock}, Requested: ${item.quantity}.`
      );
    }

    // Use priceOverride if available, otherwise basePrice
    const unitPrice = size.priceOverride ?? product.basePrice;
    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;

    // Add to processed items for order document
    processedItems.push({
      productId: product._id,
      productSizeId: size._id!, // We can use non-null assertion '!' here
      title: product.title,
      size: size.size,
      image: product.images[0], // Use the first image
      quantity: item.quantity,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
    });

    // Add to stock update list
    stockUpdates.push({
      productId: product._id.toString(),
      sizeId: size._id!.toString(), // We can use non-null assertion '!' here
      quantity: item.quantity,
    });
  }

  // 3. Validate and apply coupon
  let couponValidation: TCouponValidationResponse = {
    isValid: false,
    discountAmount: 0,
    message: "",
  };

  if (couponCode) {
    couponValidation = await CouponService.validateAndApplyCoupon(
      couponCode,
      subtotal
    );
    if (!couponValidation.isValid) {
      // If coupon is invalid, we don't block the order, just throw the error message
      throw new ApiError(httpStatus.BAD_REQUEST, couponValidation.message);
    }
  }

  // 4. Calculate final totals
  const discountAmount = couponValidation.discountAmount;
  const totalAmount = subtotal + shipping - discountAmount;

  // 5. Create the order within a transaction
  const session = await mongoose.startSession();
  let newOrder: TOrder | null = null;
  try {
    session.startTransaction();

    // 5a. Decrement product stock
    for (const update of stockUpdates) {
      await Product.updateOne(
        { _id: update.productId, "sizes._id": update.sizeId },
        { $inc: { "sizes.$.stock": -update.quantity } },
        { session }
      );
    }

    // 5b. Increment coupon usage
    if (couponValidation.isValid && couponValidation.coupon) {
      await Coupon.updateOne(
        // Errors 4, 5 are fixed by changes in coupon.interface.ts
        { _id: couponValidation.coupon._id },
        { $inc: { usedCount: 1 } },
        { session }
      );
    }

    // 5c. Create the order document
    const createdOrder = await Order.create(
      [
        {
          trackingNumber: generateTrackingNumber(),
          shippingAddress: shippingAddress,
          items: processedItems,
          orderNote: orderNote,
          subtotal: subtotal,
          shipping: shipping,
          couponId: couponValidation.coupon?._id, // Fixed by coupon.interface.ts
          discountAmount: discountAmount,
          totalAmount: totalAmount,
          paymentStatus: "pending", // Default
          status: "pending", // Default
          statusHistory: [], // Pre-save hook will add initial status
        },
      ],
      { session }
    );
    newOrder = createdOrder[0];

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();

    //
    // --- FIX 2: Handle 'unknown' error type ---
    //
    const stack = error instanceof Error ? error.stack : undefined;
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create order. Please try again.",
      stack // Pass the stack string
    );
  } finally {
    session.endSession();
  }

  if (!newOrder) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create order."
    );
  }

  return newOrder;
};

// --- Get All Orders (Admin) ---
const getAllOrdersFromDB = async (options: {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
}): Promise<IGenericResponse<TOrder[]>> => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(options);

  const result = await Order.find()
    .sort({ [sortBy]: sortOrder })
    .skip(skip)
    .limit(limit);

  const total = await Order.countDocuments();

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

// --- Get Single Order (Admin or authenticated user) ---
const getSingleOrderFromDB = async (
  orderId: string
): Promise<TOrder | null> => {
  const result = await Order.findById(orderId).populate(
    "couponId",
    "code type value"
  );
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");
  }
  return result;
};

// --- Update Order Status (Admin) ---
const updateOrderStatusInDB = async (
  orderId: string,
  adminId: string,
  payload: {
    //
    // --- FIX 3: Error 7 fixed by import ---
    //
    status: (typeof OrderStatus)[number];
    paymentStatus?: (typeof PaymentStatus)[number];
    note?: string;
  }
): Promise<TOrder | null> => {
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");
  }

  const { status, paymentStatus, note } = payload;

  // Add to status history
  order.statusHistory.push({
    status: status,
    note: note || `Status changed to ${status}`,
    changedBy: new mongoose.Types.ObjectId(adminId),
    changedAt: new Date(),
  });

  // Update the main status fields
  order.status = status;
  if (paymentStatus) {
    order.paymentStatus = paymentStatus;
  }

  // If order is 'cancelled', we should restore stock (complex logic, simplified here)
  if (status === "cancelled") {
    console.warn(
      `Order ${orderId} cancelled. Stock should be restored. (Not implemented)`
    );
    // TODO: Add logic to restore stock
    // For each item in order.items, find Product and $inc stock
  }

  await order.save();
  return order;
};

export const OrderService = {
  createOrderIntoDB,
  getAllOrdersFromDB,
  getSingleOrderFromDB,
  updateOrderStatusInDB,
};

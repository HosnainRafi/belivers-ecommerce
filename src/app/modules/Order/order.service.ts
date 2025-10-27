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
import { TCreateOrderPayload, TOrder, TOrderItem } from "./order.interface";
import { Order } from "./order.model";
import { generateTrackingNumber } from "./order.utils";
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
  // Prepare stock updates
  const stockUpdates: {
    productId: string;
    sizeId: string;
    quantity: number;
    title: string; // For potential error messages
    size: string; // For potential error messages
  }[] = [];

  // 2. Validate items, calculate subtotal, prepare stock updates
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
      (s) => s._id?.toString() === item.productSizeId
    );

    if (!size) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Invalid size ID ${item.productSizeId} for product "${product.title}".`
      );
    }

    // *** STOCK CHECK REMAINS CRUCIAL ***
    if (size.stock < item.quantity) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Not enough stock for ${product.title} (Size: ${size.size}). Available: ${size.stock}, Requested: ${item.quantity}.`
      );
    }

    const unitPrice = size.priceOverride ?? product.basePrice;
    const totalPrice = unitPrice * item.quantity;
    subtotal += totalPrice;

    processedItems.push({
      productId: product._id,
      productSizeId: size._id!,
      title: product.title,
      size: size.size,
      image: product.images[0],
      quantity: item.quantity,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
    });

    // Add to stock update list
    stockUpdates.push({
      productId: product._id.toString(),
      sizeId: size._id!.toString(),
      quantity: item.quantity,
      title: product.title,
      size: size.size,
    });
  }

  // 3. Validate and apply coupon (ensure coupon service uses items if needed)
  let couponValidation: TCouponValidationResponse = {
    isValid: false,
    discountAmount: 0,
    message: "",
  };
  if (couponCode) {
    // Assuming coupon service needs items for category/product checks
    couponValidation = await CouponService.validateAndApplyCoupon(
      couponCode,
      items // Pass cart items
    );
    if (!couponValidation.isValid) {
      throw new ApiError(httpStatus.BAD_REQUEST, couponValidation.message);
    }
  }

  // 4. Calculate final totals (unchanged)
  const discountAmount = couponValidation.discountAmount;
  const totalAmount = subtotal + shipping - discountAmount;

  // 5. Create the order AND DECREMENT STOCK within a transaction
  const session = await mongoose.startSession();
  let newOrder: TOrder | null = null;
  try {
    session.startTransaction();

    // 5a. Decrement product stock (Reserve stock)
    for (const update of stockUpdates) {
      const updateResult = await Product.updateOne(
        // Atomically check stock >= quantity during update to prevent race conditions
        {
          _id: update.productId,
          "sizes._id": update.sizeId,
          "sizes.stock": { $gte: update.quantity },
        },
        { $inc: { "sizes.$.stock": -update.quantity } },
        { session }
      );

      // If updateResult.modifiedCount is 0, stock was insufficient (race condition)
      if (updateResult.modifiedCount === 0) {
        throw new ApiError(
          httpStatus.CONFLICT, // 409 Conflict is appropriate
          `Stock changed for ${update.title} (Size: ${update.size}) just before order completion. Please try again.`
        );
      }
    }

    // 5b. Increment coupon usage (unchanged)
    if (couponValidation.isValid && couponValidation.coupon) {
      await Coupon.updateOne(
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
          couponId: couponValidation.coupon?._id,
          discountAmount: discountAmount,
          totalAmount: totalAmount,
          paymentStatus: "pending",
          status: "pending", // Order starts as pending
          statusHistory: [], // Pre-save hook adds initial history
        },
      ],
      { session }
    );
    newOrder = createdOrder[0];

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    // Pass specific error messages through
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to create order. Please try again.";
    const statusCode =
      error instanceof ApiError
        ? error.statusCode
        : httpStatus.INTERNAL_SERVER_ERROR;
    const stack = error instanceof Error ? error.stack : undefined;
    throw new ApiError(statusCode, message, stack);
  } finally {
    session.endSession();
  }

  if (!newOrder) {
    // Should not happen if transaction logic is correct
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create order after transaction."
    );
  }

  return newOrder;
};

// --- Get All Orders (Admin) --- (Unchanged)
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

// --- Get Single Order (Admin or authenticated user) --- (Unchanged)
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
    status: (typeof OrderStatus)[number];
    paymentStatus?: (typeof PaymentStatus)[number];
    note?: string;
  }
): Promise<TOrder | null> => {
  // Use a session for atomicity
  const session = await mongoose.startSession();
  let updatedOrder: TOrder | null = null;

  try {
    session.startTransaction();

    const order = await Order.findById(orderId).session(session);
    if (!order) {
      throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");
    }

    const { status, paymentStatus, note } = payload;
    const previousStatus = order.status;

    // If status isn't changing, just update payment/note and save
    if (status === previousStatus) {
      let changed = false;
      if (paymentStatus && order.paymentStatus !== paymentStatus) {
        order.paymentStatus = paymentStatus;
        changed = true;
      }
      // Add a note even if status doesn't change
      if (note) {
        order.statusHistory.push({
          status: previousStatus, // Keep current status
          note: `Note added: ${note}`,
          changedBy: new mongoose.Types.ObjectId(adminId),
          changedAt: new Date(),
        });
        changed = true;
      }
      // Only save if something actually changed
      if (changed) {
        updatedOrder = await order.save({ session });
      } else {
        updatedOrder = order; // Return the unchanged order
      }
      await session.commitTransaction();
      session.endSession();
      return updatedOrder;
    }

    // --- MANAGE STOCK REVERSAL ON CANCELLATION ---
    // INCREMENT Stock ONLY when cancelling an order where stock was previously reserved/decremented.
    if (
      status === "cancelled" &&
      (previousStatus === "pending" || // Stock was decremented on creation
        previousStatus === "confirmed" ||
        previousStatus === "shipped") // Check all states where stock was held
    ) {
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.productId, "sizes._id": item.productSizeId },
          { $inc: { "sizes.$.stock": item.quantity } }, // Add back the quantity
          { session }
        );
      }
    }
    // --- NO Stock decrement needed on confirmation/shipping anymore ---

    // Update the order document status and history
    order.statusHistory.push({
      status: status,
      note: note || `Status changed from ${previousStatus} to ${status}`,
      changedBy: new mongoose.Types.ObjectId(adminId),
      changedAt: new Date(),
    });
    order.status = status;
    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    updatedOrder = await order.save({ session });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    const message =
      error instanceof ApiError
        ? error.message
        : "Failed to update order status or stock.";
    const stack = error instanceof Error ? error.stack : undefined;
    throw new ApiError(
      error instanceof ApiError
        ? error.statusCode
        : httpStatus.INTERNAL_SERVER_ERROR,
      message,
      stack
    );
  } finally {
    session.endSession();
  }

  return updatedOrder;
};

export const OrderService = {
  createOrderIntoDB,
  getAllOrdersFromDB,
  getSingleOrderFromDB,
  updateOrderStatusInDB,
};

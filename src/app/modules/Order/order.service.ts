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
import {
  TCreateOrderPayload,
  TOrder,
  TOrderItem,
  TPublicOrderTracking,
} from "./order.interface";
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
  const stockUpdates: {
    productId: string;
    sizeId: string;
    quantity: number;
    title: string;
    size: string;
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

    stockUpdates.push({
      productId: product._id.toString(),
      sizeId: size._id!.toString(),
      quantity: item.quantity,
      title: product.title,
      size: size.size,
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
      items
    );
    if (!couponValidation.isValid) {
      throw new ApiError(httpStatus.BAD_REQUEST, couponValidation.message);
    }
  }

  // 4. Calculate final totals
  const discountAmount = couponValidation.discountAmount;
  const totalAmount = subtotal + shipping - discountAmount;

  // 5. Create the order AND DECREMENT STOCK (Reservation)
  const session = await mongoose.startSession();
  let newOrder: TOrder | null = null;
  try {
    session.startTransaction();

    // 5a. Decrement product stock
    for (const update of stockUpdates) {
      // --- THIS IS THE FIX ---
      // We use $elemMatch to check stock atomically
      // and arrayFilters to update the specific size
      const updateResult = await Product.updateOne(
        {
          _id: update.productId,
          sizes: {
            $elemMatch: {
              _id: new mongoose.Types.ObjectId(update.sizeId),
              stock: { $gte: update.quantity },
            },
          },
        },
        { $inc: { "sizes.$[elem].stock": -update.quantity } }, // Use $[elem]
        {
          session,
          // Explicitly define 'elem' to match the sizeId
          arrayFilters: [
            { "elem._id": new mongoose.Types.ObjectId(update.sizeId) },
          ],
        }
      );
      // --- END OF FIX ---

      if (updateResult.modifiedCount === 0) {
        throw new ApiError(
          httpStatus.CONFLICT,
          `Stock changed for ${update.title} (Size: ${update.size}) just before order completion. Please try again.`
        );
      }
    }

    // 5b. Increment coupon usage
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
          status: "pending",
          statusHistory: [],
        },
      ],
      { session }
    );
    newOrder = createdOrder[0];

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
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
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create order after transaction."
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
  return { meta: { page, limit, total }, data: result };
};

// --- Get Single Order (Admin) ---
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

    if (status === previousStatus) {
      let changed = false;
      if (paymentStatus && order.paymentStatus !== paymentStatus) {
        order.paymentStatus = paymentStatus;
        changed = true;
      }
      if (note) {
        order.statusHistory.push({
          status: previousStatus,
          note: `Note added: ${note}`,
          changedBy: new mongoose.Types.ObjectId(adminId),
          changedAt: new Date(),
        });
        changed = true;
      }
      if (changed) {
        updatedOrder = await order.save({ session });
      } else {
        updatedOrder = order;
      }
      await session.commitTransaction();
      session.endSession();
      return updatedOrder;
    }

    // --- REVERT STOCK ON CANCELLATION (using arrayFilters) ---
    if (
      status === "cancelled" &&
      (previousStatus === "pending" ||
        previousStatus === "confirmed" ||
        previousStatus === "shipped")
    ) {
      for (const item of order.items) {
        // --- THIS IS THE FIX ---
        await Product.updateOne(
          { _id: item.productId },
          { $inc: { "sizes.$[elem].stock": item.quantity } }, // Add back
          {
            session,
            arrayFilters: [
              { "elem._id": new mongoose.Types.ObjectId(item.productSizeId) },
            ],
          }
        );
        // --- END OF FIX ---
      }
    }

    // Update the order document status
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

const trackOrderPublicly = async (
  trackingNumber?: string,
  mobile?: string
): Promise<TPublicOrderTracking[]> => {
  // <-- Returns an array

  const orConditions = [];
  if (trackingNumber) {
    orConditions.push({ trackingNumber: trackingNumber });
  }
  if (mobile) {
    orConditions.push({ "shippingAddress.mobile": mobile });
  }

  // Zod ensures at least one condition is present
  const query = { $or: orConditions };

  // Find all matching orders, sort by newest first
  const orders = await Order.find(query).sort({ createdAt: -1 });

  if (orders.length === 0) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "No orders found matching your details."
    );
  }

  // Map to the safe public-facing type
  const publicOrdersData: TPublicOrderTracking[] = orders.map((order) => ({
    trackingNumber: order.trackingNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    statusHistory: order.statusHistory,
    createdAt: (order as any).createdAt, // Mongoose doc has this
    items: order.items.map((item) => ({
      title: item.title,
      size: item.size,
      quantity: item.quantity,
      image: item.image,
    })),
  }));

  return publicOrdersData;
};

export const OrderService = {
  createOrderIntoDB,
  getAllOrdersFromDB,
  getSingleOrderFromDB,
  updateOrderStatusInDB,
  trackOrderPublicly,
};

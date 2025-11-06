// src/app/modules/Order/order.controller.ts
import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { TOrder, TPublicOrderTracking } from "./order.interface";
import { OrderService } from "./order.service";
import pick from "../../../shared/pick";

// --- Public Controller ---
const createOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.createOrderIntoDB(req.body);
  sendResponse<TOrder>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Order placed successfully!",
    data: result,
  });
});

// --- Admin Controllers ---
const getAllOrders = catchAsync(async (req: Request, res: Response) => {
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);
  const result = await OrderService.getAllOrdersFromDB(options);
  sendResponse<TOrder[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Orders retrieved successfully!",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleOrder = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await OrderService.getSingleOrderFromDB(id);
  sendResponse<TOrder>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order retrieved successfully!",
    data: result,
  });
});

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user!.userId;
  const result = await OrderService.updateOrderStatusInDB(
    id,
    adminId,
    req.body
  );
  sendResponse<TOrder>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order status updated successfully!",
    data: result,
  });
});

const trackOrder = catchAsync(async (req: Request, res: Response) => {
  const { trackingNumber, mobile } = req.body;
  const result = await OrderService.trackOrderPublicly(trackingNumber, mobile);

  sendResponse<TPublicOrderTracking[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Order status retrieved successfully!",
    data: result,
  });
});

export const OrderController = {
  createOrder,
  getAllOrders,
  getSingleOrder,
  updateOrderStatus,
  trackOrder,
};

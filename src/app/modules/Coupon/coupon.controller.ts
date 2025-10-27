// src/app/modules/Coupon/coupon.controller.ts
import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { TCoupon } from "./coupon.interface";
import { CouponService, TCouponValidationResponse } from "./coupon.service";

// --- Admin Controllers ---

const createCoupon = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.user!.userId;
  const result = await CouponService.createCouponIntoDB(adminId, req.body);
  sendResponse<TCoupon>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Coupon created successfully!",
    data: result,
  });
});

// ... (rest of the file is unchanged) ...
// --- Omitted for brevity ---

const getAllCoupons = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.getAllCouponsFromDB();
  sendResponse<TCoupon[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Coupons retrieved successfully!",
    data: result,
  });
});

const getSingleCoupon = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CouponService.getSingleCouponFromDB(id);
  sendResponse<TCoupon>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Coupon retrieved successfully!",
    data: result,
  });
});

const updateCoupon = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CouponService.updateCouponInDB(id, req.body);
  sendResponse<TCoupon>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Coupon updated successfully!",
    data: result,
  });
});

const deleteCoupon = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CouponService.deleteCouponFromDB(id);
  sendResponse<TCoupon>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Coupon deleted successfully!",
    data: result,
  });
});

// --- Public Controller ---

const applyCoupon = catchAsync(async (req: Request, res: Response) => {
  const { code, items } = req.body;
  const result = await CouponService.validateAndApplyCoupon(code, items);

  sendResponse<TCouponValidationResponse>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

export const CouponController = {
  createCoupon,
  getAllCoupons,
  getSingleCoupon,
  updateCoupon,
  deleteCoupon,
  applyCoupon,
};

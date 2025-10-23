// src/app/modules/Review/review.controller.ts
import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { TReview } from "./review.interface";
import { ReviewService } from "./review.service";

const createReview = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.createReviewIntoDB(req.body);
  sendResponse<TReview>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message:
      "Review submitted successfully! It will be visible after approval.",
    data: result,
  });
});

const getApprovedReviewsForProduct = catchAsync(
  async (req: Request, res: Response) => {
    const { productId } = req.params;
    const result = await ReviewService.getApprovedReviewsForProduct(productId);
    sendResponse<TReview[]>(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Reviews retrieved successfully!",
      data: result,
    });
  }
);

const getAllReviews = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.getAllReviewsFromDB();
  sendResponse<TReview[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All reviews retrieved successfully!",
    data: result,
  });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ReviewService.updateReviewInDB(id, req.body);
  sendResponse<TReview>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review updated successfully!",
    data: result,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ReviewService.deleteReviewFromDB(id);
  sendResponse<TReview>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review deleted successfully!",
    data: result,
  });
});

export const ReviewController = {
  createReview,
  getApprovedReviewsForProduct,
  getAllReviews,
  updateReview,
  deleteReview,
};

// src/app/modules/Review/review.service.ts
import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { Order } from "../Order/order.model";
// --- FIX 1: Import the new TCreateReviewPayload type ---
import { TCreateReviewPayload, TReview } from "./review.interface";
import { Review } from "./review.model";

// --- Create Review (Public) ---
// --- FIX 2: Change the payload type here ---
const createReviewIntoDB = async (
  payload: TCreateReviewPayload
): Promise<TReview> => {
  // --- FIX 3: Destructuring now works correctly ---
  const { orderId, productId, customerName, rating, comment } = payload;

  // 1. Verify the order
  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(httpStatus.NOT_FOUND, "Order not found.");
  }

  // 2. (Recommended) Check if order is delivered
  if (order.status !== "delivered") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "You can only review delivered orders."
    );
  }

  // 3. Verify the product exists in the order
  const productInOrder = order.items.find(
    (item) => item.productId.toString() === productId.toString()
  );
  if (!productInOrder) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This product was not found in your order."
    );
  }

  // 4. Check for duplicate review (the db index will also catch this)
  const existingReview = await Review.findOne({
    order: orderId,
    product: productId,
  });
  if (existingReview) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "You have already reviewed this product for this order."
    );
  }

  // 5. Create the review (it's unapproved by default)
  // --- FIX 4: Map the fields to the Mongoose model schema ---
  const result = await Review.create({
    product: productId, // Mongoose casts 'productId' string to 'product' ObjectId
    order: orderId, // Mongoose casts 'orderId' string to 'order' ObjectId
    customerName: customerName,
    rating: rating,
    comment: comment,
    isApproved: false, // Admin must approve
  });

  return result;
};

// --- Get Approved Reviews for a Product (Public) ---
const getApprovedReviewsForProduct = async (
  productId: string
): Promise<TReview[]> => {
  const result = await Review.find({
    product: new Types.ObjectId(productId),
    isApproved: true,
  }).sort({ createdAt: -1 }); // Show newest first
  return result;
};

// --- Get All Reviews (Admin) ---
const getAllReviewsFromDB = async (): Promise<TReview[]> => {
  const result = await Review.find()
    .populate("product", "title slug")
    .sort({ createdAt: -1 });
  return result;
};

// --- Update Review (Admin) ---
const updateReviewInDB = async (
  reviewId: string,
  payload: Partial<Pick<TReview, "isApproved" | "comment">>
): Promise<TReview | null> => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, "Review not found.");
  }

  // Update fields
  review.isApproved = payload.isApproved ?? review.isApproved;
  if (payload.comment) {
    review.comment = payload.comment;
  }

  await review.save(); // This will trigger the post('save') hook
  return review;
};

// --- Delete Review (Admin) ---
const deleteReviewFromDB = async (
  reviewId: string
): Promise<TReview | null> => {
  // We use findOneAndDelete to trigger the post hook
  const result = await Review.findOneAndDelete({ _id: reviewId });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Review not found.");
  }
  return result;
};

export const ReviewService = {
  createReviewIntoDB,
  getApprovedReviewsForProduct,
  getAllReviewsFromDB,
  updateReviewInDB,
  deleteReviewFromDB,
};

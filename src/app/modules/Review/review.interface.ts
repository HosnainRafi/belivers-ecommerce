// src/app/modules/Review/review.interface.ts
import { Model, Types } from "mongoose";

export type TReview = {
  _id?: Types.ObjectId;
  product: Types.ObjectId; // Ref to Product
  order: Types.ObjectId; // Ref to Order
  customerName: string;
  rating: number; // 1-5
  comment: string;
  isApproved: boolean;
};

// Interface for the model's static methods
export interface ReviewModel extends Model<TReview> {
  calculateAverageRating(productId: string): Promise<void>;
}

//
// --- ADD THIS NEW TYPE ---
//
// This type matches the Zod validation input from req.body
export type TCreateReviewPayload = {
  productId: string;
  orderId: string;
  customerName: string;
  rating: number;
  comment: string;
};

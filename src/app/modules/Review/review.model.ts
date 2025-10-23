// src/app/modules/Review/review.model.ts
import { Schema, model, Types } from "mongoose";
import { TReview, ReviewModel } from "./review.interface";
import { Product } from "../Product/product.model";

const reviewSchema = new Schema<TReview, ReviewModel>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

// Create a compound index to prevent duplicate reviews for the same product in the same order
reviewSchema.index({ product: 1, order: 1 }, { unique: true });

// --- Static Method to Calculate Average Rating ---
reviewSchema.statics.calculateAverageRating = async function (
  productId: string
) {
  // 1. Find all *approved* reviews for this product
  const stats = await this.aggregate([
    {
      $match: { product: new Types.ObjectId(productId), isApproved: true },
    },
    {
      $group: {
        _id: "$product",
        reviewCount: { $sum: 1 },
        averageRating: { $avg: "$rating" },
      },
    },
  ]);

  // 2. Update the Product document
  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      reviewCount: stats[0].reviewCount,
      averageRating: parseFloat(stats[0].averageRating.toFixed(1)), // Keep one decimal place
    });
  } else {
    // No approved reviews, reset to 0
    await Product.findByIdAndUpdate(productId, {
      reviewCount: 0,
      averageRating: 0,
    });
  }
};

// --- Hooks to trigger recalculation ---

// Call this hook after saving a new review OR updating (e.g., isApproved changes)
reviewSchema.post("save", async function () {
  // 'this' refers to the review document
  // We need to access the constructor to call the static method
  await (this.constructor as ReviewModel).calculateAverageRating(
    this.product.toString()
  );
});

// Call this hook after removing a review
// We use 'findOneAndDelete' as the trigger
reviewSchema.post("findOneAndDelete", async function (doc: TReview) {
  if (doc) {
    await (doc.constructor as ReviewModel).calculateAverageRating(
      doc.product.toString()
    );
  }
});

export const Review = model<TReview, ReviewModel>("Review", reviewSchema);

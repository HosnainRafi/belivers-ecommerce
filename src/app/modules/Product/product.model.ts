// src/app/modules/Product/product.model.ts
import { Schema, model } from "mongoose";
import { TProduct, TProductSize } from "./product.interface";
import { Category } from "../Category/category.model";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiError";

// Embedded Schema for Product Sizes
const productSizeSchema = new Schema<TProductSize>(
  {
    size: {
      type: String,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    priceOverride: {
      type: Number,
      min: 0,
    },
    sku: {
      type: String,
      trim: true,
    },
  },
  { _id: true } // Ensure sub-documents get their own _id
);

// Main Product Schema
const productSchema = new Schema<TProduct>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
    },
    category: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Category", // Links to the Category model
    },
    basePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    images: {
      type: [String],
      required: true,
    },
    sizes: {
      type: [productSizeSchema], // Embed the size schema
      required: true,
      validate: [
        (v: TProductSize[]) => v.length > 0,
        "At least one size is required.",
      ],
    },
    sku: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null/undefined values, but unique if set
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

// Pre-save hook to validate category and slug
productSchema.pre("save", async function (next) {
  // 1. Validate Category ID
  const category = await Category.findById(this.category);
  if (!category) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid Category ID.");
  }

  // 2. Validate Slug uniqueness (on create or if slug changed)
  if (this.isModified("slug")) {
    const existing = await Product.findOne({ slug: this.slug });
    if (existing && existing._id.toString() !== this._id.toString()) {
      return next(
        new Error(`A product with the slug '${this.slug}' already exists.`)
      );
    }
  }

  // 3. (Optional) Validate SKU uniqueness if set
  if (this.sku && (this.isNew || this.isModified("sku"))) {
    const existingSku = await Product.findOne({ sku: this.sku });
    if (existingSku && existingSku._id.toString() !== this._id.toString()) {
      return next(
        new Error(`A product with the SKU '${this.sku}' already exists.`)
      );
    }
  }

  next();
});

export const Product = model<TProduct>("Product", productSchema);

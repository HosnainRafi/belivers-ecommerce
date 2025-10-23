// src/app/modules/Product/product.interface.ts
import { Types } from "mongoose";

// Interface for the embedded size object
export type TProductSize = {
  _id?: Types.ObjectId; // <-- ADD THIS LINE
  size: string; // e.g., S, M, L, XL, 32, 34
  stock: number;
  priceOverride?: number; // Optional price for this specific size
  sku?: string;
};

// Interface for the main Product
export type TProduct = {
  title: string;
  slug: string;
  description?: string;
  category: Types.ObjectId; // Reference to the Category model
  basePrice: number;
  compareAtPrice?: number;
  images: string[]; // Array of image URLs
  sizes: TProductSize[]; // Array of embedded size/stock documents
  sku?: string; // Main product SKU (optional)
  isActive: boolean;
  averageRating: number;
  reviewCount: number;
};

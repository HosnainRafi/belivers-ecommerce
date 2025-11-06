import { Types } from "mongoose";

// src/app/modules/Category/category.interface.ts

export type TCategoryGender = "Men" | "Women" | "Unisex";

export type TCategory = {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  order?: number;
  sizeChart?: string;
  parentCategory?: Types.ObjectId | null;
  gender?: TCategoryGender;
};

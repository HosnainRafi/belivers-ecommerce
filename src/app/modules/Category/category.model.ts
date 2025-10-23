// src/app/modules/Category/category.model.ts
import { Schema, model } from "mongoose";
import { TCategory } from "./category.interface";

const categorySchema = new Schema<TCategory>(
  {
    name: {
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
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

// Pre-save hook to ensure slug uniqueness on update
categorySchema.pre("save", async function (next) {
  if (this.isModified("slug")) {
    const existing = await Category.findOne({ slug: this.slug });
    if (existing && existing._id.toString() !== this._id.toString()) {
      return next(
        new Error(`A category with the slug '${this.slug}' already exists.`)
      );
    }
  }
  next();
});

export const Category = model<TCategory>("Category", categorySchema);

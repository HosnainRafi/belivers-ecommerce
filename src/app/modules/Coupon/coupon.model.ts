// src/app/modules/Coupon/coupon.model.ts
import { Schema, model } from "mongoose";
import { TCoupon } from "./coupon.interface";
import { CouponType } from "./coupon.constants";
import ApiError from "../../../errors/ApiError";
import httpStatus from "http-status";
import { Admin } from "../Admin/admin.model";

const couponSchema = new Schema<TCoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
    },
    type: {
      type: String,
      enum: CouponType,
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderAmount: {
      type: Number,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      min: 0,
    },
    usageLimit: {
      type: Number,
      required: true,
      min: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
  }
);

// Pre-save hook to validate 'createdBy' admin ID
couponSchema.pre("save", async function (next) {
  // Validate 'createdBy'
  if (this.isModified("createdBy") || this.isNew) {
    const admin = await Admin.findById(this.createdBy);
    if (!admin) {
      return next(
        new ApiError(httpStatus.BAD_REQUEST, 'Invalid "createdBy" admin ID.')
      );
    }
  }

  // Validate code uniqueness on save
  if (this.isModified("code") || this.isNew) {
    const existing = await Coupon.findOne({ code: this.code });
    if (existing && existing._id.toString() !== this._id.toString()) {
      return next(
        new ApiError(
          httpStatus.CONFLICT,
          `A coupon with the code '${this.code}' already exists.`
        )
      );
    }
  }

  next();
});

export const Coupon = model<TCoupon>("Coupon", couponSchema);

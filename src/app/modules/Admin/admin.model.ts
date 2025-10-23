// src/app/modules/Admin/admin.model.ts
import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { Schema, model } from "mongoose";
import config from "../../../config";
import ApiError from "../../../errors/ApiError";
import { AdminRole } from "./admin.constants";
import { AdminModel, TAdmin } from "./admin.interface";

const adminSchema = new Schema<TAdmin, AdminModel>(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: 0, // Default: hide password from query results
    },
    role: {
      type: String,
      enum: AdminRole,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      //
      // --- THIS IS THE FIX ---
      // Explicitly type 'ret' as a generic object
      //
      transform: (doc, ret: Record<string, any>) => {
        delete ret.password;
        return ret;
      },
    },
  }
);

// --- Static Methods ---

// Check if admin exists
adminSchema.statics.isAdminExists = async function (
  email: string
): Promise<TAdmin | null> {
  return await this.findOne({ email }).exec();
};

// Check if password matches
adminSchema.statics.isUserPasswordMatched = async function (
  plainPassword,
  hashedPassword
) {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

// --- Pre-save Hook for Password Hashing ---
adminSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) {
    return next();
  }

  // Check for duplicate email before saving
  const existingAdmin = await Admin.isAdminExists(this.email);
  if (existingAdmin) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "An admin with this email already exists."
    );
  }

  // Hash the password
  this.password = await bcrypt.hash(this.password, config.bcrypt_salt_rounds);
  next();
});

export const Admin = model<TAdmin, AdminModel>("Admin", adminSchema);

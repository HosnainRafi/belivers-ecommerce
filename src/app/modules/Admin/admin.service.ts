// src/app/modules/Admin/admin.service.ts
import httpStatus from "http-status";
import { Secret } from "jsonwebtoken";
import config from "../../../config";
import ApiError from "../../../errors/ApiError";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import { Admin } from "./admin.model";
import { TAdmin, TLoginAdmin, TLoginAdminResponse } from "./admin.interface";

const createAdminIntoDB = async (payload: TAdmin): Promise<TAdmin> => {
  // The pre-save hook in the model will handle hashing and duplicate checks
  const result = await Admin.create(payload);
  return result;
};

const loginAdmin = async (
  payload: TLoginAdmin
): Promise<TLoginAdminResponse> => {
  const { email, password } = payload;

  // 1. Check if admin exists
  // We must use .select('+password') to retrieve the password
  const admin = await Admin.findOne({ email }).select("+password");
  if (!admin) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin account not found.");
  }

  // 2. Check if password is correct
  const isPasswordMatched = await Admin.isUserPasswordMatched(
    password,
    admin.password
  );

  if (!isPasswordMatched) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Incorrect email or password.");
  }

  // 3. Create JWT payload
  const jwtPayload = {
    userId: admin._id,
    role: admin.role,
  };

  // 4. Generate Access Token
  const accessToken = jwtHelpers.createToken(
    jwtPayload,
    config.jwt.secret as Secret,
    config.jwt.expires_in as string
  );

  // 5. Format admin data to return (excluding password)
  const adminData = {
    _id: admin._id.toString(),
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };

  return {
    accessToken,
    adminData,
  };
};

export const AdminService = {
  createAdminIntoDB,
  loginAdmin,
};

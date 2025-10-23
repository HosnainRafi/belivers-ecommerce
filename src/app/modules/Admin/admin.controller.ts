// src/app/modules/Admin/admin.controller.ts
import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { TAdmin, TLoginAdminResponse } from "./admin.interface";
import { AdminService } from "./admin.service";

const createAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.createAdminIntoDB(req.body);

  sendResponse<TAdmin>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Admin created successfully!",
    data: result,
  });
});

const loginAdmin = catchAsync(async (req: Request, res: Response) => {
  const result = await AdminService.loginAdmin(req.body);

  sendResponse<TLoginAdminResponse>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin logged in successfully!",
    data: result,
  });
});

export const AdminController = {
  createAdmin,
  loginAdmin,
};

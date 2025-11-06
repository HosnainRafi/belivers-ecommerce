// src/app/modules/Product/product.controller.ts
import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import pick from "../../../shared/pick";
import sendResponse from "../../../shared/sendResponse";
import { TProduct } from "./product.interface";
import { ProductService } from "./product.service";

const createProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.createProductIntoDB(req.body);
  sendResponse<TProduct>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Product created successfully!",
    data: result,
  });
});

const getAllProducts = catchAsync(async (req: Request, res: Response) => {
  // Filtering & Pagination
  const filters = pick(req.query, [
    "searchTerm",
    "category",
    "size",
    "minPrice",
    "maxPrice",
    "newArrival",
    "isActive",
    "gender",
  ]);
  const options = pick(req.query, ["page", "limit", "sortBy", "sortOrder"]);

  const result = await ProductService.getAllProductsFromDB(filters, options);
  sendResponse<TProduct[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Products retrieved successfully!",
    meta: result.meta,
    data: result.data,
  });
});

const getSingleProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params; // Can be ID or Slug
  const result = await ProductService.getSingleProductFromDB(id);
  sendResponse<TProduct>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product retrieved successfully!",
    data: result,
  });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ProductService.updateProductInDB(id, req.body);
  sendResponse<TProduct>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product updated successfully!",
    data: result,
  });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ProductService.deleteProductFromDB(id);
  sendResponse<TProduct>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product (soft) deleted successfully!",
    data: result,
  });
});

const applyCategoryDiscount = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ProductService.applyCategoryDiscountToDB(req.body);

    sendResponse<{ modifiedCount: number }>(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: `${result.modifiedCount} products updated successfully!`,
      data: result,
    });
  }
);

const hardDeleteProduct = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await ProductService.hardDeleteProductFromDB(id);

  // Define the expected structure for clarity (optional but good practice)
  type HardDeleteResponse = {
    deleted: boolean;
    message: string;
    product: TProduct | null;
  };

  sendResponse<HardDeleteResponse>(res, {
    statusCode: httpStatus.OK,
    success: result.deleted,
    message: result.message,
    data: result,
  });
});

export const ProductController = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  applyCategoryDiscount,
  hardDeleteProduct,
};

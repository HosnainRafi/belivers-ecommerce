// src/app/modules/Category/category.controller.ts
import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { TCategory } from "./category.interface";
import { CategoryService } from "./category.service";

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.createCategoryIntoDB(req.body);
  sendResponse<TCategory>(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Category created successfully!",
    data: result,
  });
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getAllCategoriesFromDB();
  sendResponse<TCategory[]>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Categories retrieved successfully!",
    data: result,
  });
});

const getSingleCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CategoryService.getSingleCategoryFromDB(id);
  sendResponse<TCategory>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category retrieved successfully!",
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CategoryService.updateCategoryInDB(id, req.body);
  sendResponse<TCategory>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category updated successfully!",
    data: result,
  });
});

const getSubcategoriesByParent = catchAsync(
  async (req: Request, res: Response) => {
    const { parentId } = req.params;
    const result = await CategoryService.getSubcategoriesByParentId(parentId);
    sendResponse<TCategory[]>(res, {
      // Use TCategory[] as it returns a flat list
      statusCode: httpStatus.OK,
      success: true,
      message: "Subcategories retrieved successfully!",
      data: result,
    });
  }
);

const getAllSubcategories = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getAllSubcategoriesFromDB();
  sendResponse<TCategory[]>(res, {
    // Returns a flat list
    statusCode: httpStatus.OK,
    success: true,
    message: "All subcategories retrieved successfully!",
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await CategoryService.deleteCategoryFromDB(id);
  sendResponse<TCategory>(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category deleted successfully!",
    data: result,
  });
});

export const CategoryController = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  getSubcategoriesByParent,
  deleteCategory,
  getAllSubcategories,
};

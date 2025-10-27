// src/app/modules/upload/upload.controller.ts

import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync';
import sendResponse from '../../../shared/sendResponse';

// Single image upload
const uploadSingleImage = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(httpStatus.BAD_REQUEST).json({
      success: false,
      message: 'No file uploaded',
    });
  }

  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${
    req.file.filename
  }`;

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Image uploaded successfully',
    data: {
      filename: req.file.filename,
      url: imageUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
});

// Multiple images upload
const uploadMultipleImages = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(httpStatus.BAD_REQUEST).json({
        success: false,
        message: 'No files uploaded',
      });
    }

    const files = req.files as Express.Multer.File[];
    const imageUrls = files.map(file => ({
      filename: file.filename,
      url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`,
      size: file.size,
      mimetype: file.mimetype,
    }));

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Images uploaded successfully',
      data: imageUrls,
    });
  }
);

// Delete uploaded image
const deleteImage = catchAsync(async (req: Request, res: Response) => {
  const { filename } = req.params;
  const fs = require('fs');
  const path = require('path');

  const filePath = path.join(process.cwd(), 'public', 'uploads', filename);

  // Check if file exists
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Image deleted successfully',
      data: null,
    });
  } else {
    return res.status(httpStatus.NOT_FOUND).json({
      success: false,
      message: 'Image not found',
    });
  }
});

export const UploadController = {
  uploadSingleImage,
  uploadMultipleImages,
  deleteImage,
};

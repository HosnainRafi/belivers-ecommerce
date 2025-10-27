// src/app/modules/upload/upload.routes.ts

import express from 'express';
import { uploadImage } from '../../../config/multer.config';
import { UploadController } from './upload.controller';

const router = express.Router();

// Single image upload
router.post(
  '/image',
  uploadImage.single('image'),
  UploadController.uploadSingleImage
);

// Multiple images upload (max 10)
router.post(
  '/images',
  uploadImage.array('images', 10),
  UploadController.uploadMultipleImages
);

// Delete image
router.delete('/image/:filename', UploadController.deleteImage);

export const UploadRoutes = router;

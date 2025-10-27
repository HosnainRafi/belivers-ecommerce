// src/app/routes/index.ts
import express from "express";
import { AdminRoutes } from "../modules/Admin/admin.route";
import { CategoryRoutes } from "../modules/Category/category.route";
import { CouponRoutes } from "../modules/Coupon/coupon.route";
import { OrderRoutes } from "../modules/Order/order.route"; // Import
import { ProductRoutes } from "../modules/Product/product.route";
import { ReviewRoutes } from "../modules/Review/review.route";
import { UploadRoutes } from "../modules/Upload/upload.routes";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/admin",
    route: AdminRoutes,
  },
  {
    path: "/categories",
    route: CategoryRoutes,
  },
  {
    path: "/products",
    route: ProductRoutes,
  },
  {
    path: "/coupons",
    route: CouponRoutes,
  },
  {
    path: "/orders", // Add this
    route: OrderRoutes,
  },
  { path: "/reviews", route: ReviewRoutes },
  {
    path: '/upload',
    route: UploadRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;

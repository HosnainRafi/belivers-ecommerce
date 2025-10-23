// src/app.ts
import cors from "cors";
import express, { Application, Request, Response } from "express";
import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import mainRouter from "./app/routes";
import httpStatus from "http-status";

const app: Application = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Main API Routes
app.use("/api/v1", mainRouter);

// Test Route
app.get("/", (req: Request, res: Response) => {
  res.status(httpStatus.OK).json({
    success: true,
    message: "Welcome to Believers E-Commerce API!",
  });
});

// Global Error Handler
app.use(globalErrorHandler);

// Not Found Handler
app.use((req: Request, res: Response) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: "API Not Found!",
    errorMessages: [
      {
        path: req.originalUrl,
        message: "The requested route does not exist.",
      },
    ],
  });
});

export default app;

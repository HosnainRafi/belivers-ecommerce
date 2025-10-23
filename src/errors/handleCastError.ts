// src/errors/handleCastError.ts
import mongoose from "mongoose";
import { IGenericErrorMessage } from "../interfaces/common";

const handleCastError = (err: mongoose.Error.CastError) => {
  const errors: IGenericErrorMessage[] = [
    {
      path: err.path,
      message: "Invalid ID",
    },
  ];

  const statusCode = 400;
  return {
    statusCode,
    message: "Cast Error",
    errorMessages: errors,
  };
};

export default handleCastError;

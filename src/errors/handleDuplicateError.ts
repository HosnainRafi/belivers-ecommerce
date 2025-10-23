// src/errors/handleDuplicateError.ts
import { IGenericErrorMessage } from "../interfaces/common";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleDuplicateError = (err: any) => {
  const errors: IGenericErrorMessage[] = [];

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    errors.push({
      path: field,
      message: `Duplicate value error. ${field} '${value}' already exists.`,
    });
  }

  const statusCode = 409; // 409 Conflict is often used for duplicate resources
  return {
    statusCode,
    message: "Duplicate Key Error",
    errorMessages: errors,
  };
};

export default handleDuplicateError;

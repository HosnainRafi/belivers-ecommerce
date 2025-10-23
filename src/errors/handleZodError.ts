// src/errors/handleZodError.ts
import { ZodError, ZodIssue } from "zod";
import { IGenericErrorMessage } from "../interfaces/common";

const handleZodError = (error: ZodError) => {
  const errors: IGenericErrorMessage[] = error.issues.map((issue: ZodIssue) => {
    return {
      //
      // --- THIS IS THE FIX ---
      // Convert the path segment to a string to satisfy the type.
      //
      path: issue?.path[issue.path.length - 1].toString(),
      message: issue?.message,
    };
  });

  const statusCode = 400;
  return {
    statusCode,
    message: "Validation Error",
    errorMessages: errors,
  };
};

export default handleZodError;

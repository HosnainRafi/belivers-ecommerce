import { NextFunction, Request, Response } from "express";
import { z } from "zod";

const validateRequest =
  (schema: any) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      });

      //
      // --- THIS IS THE FIX ---
      // Only re-assign req.body, as req.query and req.params are read-only.
      //
      req.body = validatedData.body;

      // We don't need to re-assign query or params, as validation has already passed.
      // req.query = validatedData.query;   <-- DELETE THIS
      // req.params = validatedData.params;  <-- DELETE THIS
      // req.cookies = validatedData.cookies; <-- DELETE THIS (if you're not modifying cookies)

      return next();
    } catch (error) {
      next(error);
    }
  };

export default validateRequest;

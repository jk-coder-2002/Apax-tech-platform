import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import AppError from "../utils/AppError";
import { isProduction } from "../config/env";

/**
 * Single place that formats every error response. Never throws further -
 * this is the last middleware in the chain.
 */
export default function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = 500;
  let message = "Internal Server Error";

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid ${err.path}`;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(", ");
  } else if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  ) {
    statusCode = 400;
    message = "A record with these details already exists";
  } else if (err instanceof Error && !isProduction) {
    message = err.message;
  }

  if (!isProduction) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(isProduction ? {} : { stack: err instanceof Error ? err.stack : undefined }),
  });
}

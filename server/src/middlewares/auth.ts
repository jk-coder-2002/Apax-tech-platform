import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

const { TokenExpiredError } = jwt;
import User from "../models/userModel";
import AppError from "../utils/AppError";
import asyncHandler from "../utils/asyncHandler";
import { config } from "../config/env";

interface DecodedToken extends JwtPayload {
  id: string;
  email: string;
}

export const isAuthenticatedUser = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const { token } = req.cookies;

    if (!token) {
      return next(new AppError("Please login to access this resource", 401));
    }

    let decoded: DecodedToken;
    try {
      decoded = jwt.verify(token, config.jwtSecret) as DecodedToken;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        return next(new AppError("Session expired, please login again", 401));
      }
      return next(new AppError("Invalid authentication token", 401));
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new AppError("Please login to access this resource", 401));
    }

    req.user = user;
    next();
  }
);

// Role-based authorization
export const authorizeRoles =
  (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(`Role: ${req.user?.role} is not allowed to access this resource`, 403));
    }

    next();
  };

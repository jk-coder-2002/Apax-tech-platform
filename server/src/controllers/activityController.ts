import { Request, Response, NextFunction } from "express";
import asyncHandler from "../utils/asyncHandler";
import AppError from "../utils/AppError";
import { sendSuccess } from "../utils/sendResponse";
import { getRecentActivityForUser } from "../services/activity";
import { ActivityResponse } from "@shared/types/api";

export const getRecentActivity = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Please login to access this resource", 401));
    }

    const activity = await getRecentActivityForUser(req.user._id);
    sendSuccess<ActivityResponse>(res, 200, { activity });
  }
);

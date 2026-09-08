import { Request, Response, NextFunction } from "express";
import asyncHandler from "../utils/asyncHandler";
import AppError from "../utils/AppError";
import { sendSuccess } from "../utils/sendResponse";
import { getHoldingsForUser } from "../services/holdings";
import { HoldingsResponse } from "@shared/types/api";

export const getHoldings = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Please login to access this resource", 401));
    }

    const holdings = await getHoldingsForUser(req.user._id);
    sendSuccess<HoldingsResponse>(res, 200, { holdings });
  }
);

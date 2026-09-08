import { Request, Response, NextFunction } from "express";
import validator from "validator";
import AppError from "../utils/AppError";

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function validateLoginBody(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const email = normalizeEmail(req.body.email);
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return next(new AppError("Please enter email and password", 400));
  }
  if (!validator.isEmail(email)) {
    return next(new AppError("Please enter a valid email", 400));
  }

  req.body.email = email;
  req.body.password = password;
  next();
}

export function validateRegisterBody(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const email = normalizeEmail(req.body.email);
  const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
  const password = typeof req.body.password === "string" ? req.body.password : "";

  if (!name || !email || !password) {
    return next(new AppError("Please enter name, email and password", 400));
  }
  if (!validator.isEmail(email)) {
    return next(new AppError("Please enter a valid email", 400));
  }
  if (password.length < 8) {
    return next(new AppError("Password should have at least 8 characters", 400));
  }

  req.body.email = email;
  req.body.name = name;
  req.body.password = password;
  next();
}

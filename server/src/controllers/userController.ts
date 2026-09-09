import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import cloudinary from "cloudinary";
import bcrypt from "bcryptjs";

import User, { IUser } from "../models/userModel";
import asyncHandler from "../utils/asyncHandler";
import sendToken from "../utils/sendToken";
import AppError from "../utils/AppError";
import sendEmail from "../utils/sendEmail";
import { sendSuccess } from "../utils/sendResponse";
import { config } from "../config/env";
import { AUTH_COOKIE_NAME, getAuthCookieOptions } from "../utils/authCookie";

// A hash of a password nobody will ever enter, used to keep the login
// timing identical whether or not the email exists (see loginUser below).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("apax-timing-safety-decoy", 10);

// ================= REGISTER =================
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
    folder: "avatars",
    width: 150,
    crop: "scale",
  });

  const { name, email, gender, password } = req.body;

  const user = await User.create({
    name,
    email,
    gender,
    password,
    avatar: {
      public_id: myCloud.public_id,
      url: myCloud.secure_url,
    },
  });

  sendToken(user, 201, res);
});

// ================= LOGIN =================
export const loginUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  // Run a bcrypt compare either way so a missing account and a wrong
  // password take the same amount of time and return the same message -
  // otherwise the response is a timing/content oracle for "does this
  // email exist".
  const isPasswordMatched = user
    ? await user.comparePassword(password)
    : await bcrypt.compare(password, DUMMY_PASSWORD_HASH);

  if (!user || !isPasswordMatched) {
    return next(new AppError("Invalid email or password", 401));
  }

  return sendToken(user, 200, res);
});

// ================= LOGOUT =================
export const logoutUser = asyncHandler(async (_req: Request, res: Response) => {
  res.cookie(AUTH_COOKIE_NAME, null, {
    ...getAuthCookieOptions(),
    expires: new Date(Date.now()),
  });

  sendSuccess(res, 200, null, "Logged out");
});

// ================= USER DETAILS =================
export const getUserDetails = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user?._id);
  sendSuccess(res, 200, { user });
});

// ================= FORGOT PASSWORD =================
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    const resetPasswordUrl = `https://${req.get("host")}/password/reset/${resetToken}`;

    try {
      await sendEmail({
        email: user.email,
        templateId: config.sendgrid.resetTemplateId as string,
        data: {
          reset_url: resetPasswordUrl,
        },
      });

      sendSuccess(res, 200, null, `Email sent to ${user.email} successfully`);
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      const message = error instanceof Error ? error.message : "Failed to send email";
      return next(new AppError(message, 500));
    }
  }
);

// ================= RESET PASSWORD =================
export const resetPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = String(req.params.token);

    const resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: new Date() },
    });

    if (!user) {
      return next(new AppError("Invalid or expired reset token", 404));
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();
    sendToken(user, 200, res);
  }
);

// ================= UPDATE PASSWORD =================
export const updatePassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user?._id).select("+password");

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

    if (!isPasswordMatched) {
      return next(new AppError("Old password is invalid", 400));
    }

    user.password = req.body.newPassword;
    await user.save();

    sendToken(user, 200, res);
  }
);

// ================= UPDATE PROFILE =================
export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const newUserData: Partial<IUser> = {
    name: req.body.name,
    email: req.body.email,
  };

  if (req.body.avatar && req.body.avatar !== "") {
    const user = await User.findById(req.user?._id);

    if (user?.avatar?.public_id) {
      await cloudinary.v2.uploader.destroy(user.avatar.public_id);
    }

    const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
      folder: "avatars",
      width: 150,
      crop: "scale",
    });

    newUserData.avatar = {
      public_id: myCloud.public_id,
      url: myCloud.secure_url,
    };
  }

  const user = await User.findByIdAndUpdate(req.user?._id, newUserData, {
    new: true,
    runValidators: true,
  });

  sendSuccess(res, 200, user);
});

// ================= ADMIN =================

// Get all users
export const getAllUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find();
  sendSuccess(res, 200, users);
});

// Get single user
export const getSingleUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError(`User doesn't exist with id: ${req.params.id}`, 404));
    }

    sendSuccess(res, 200, user);
  }
);

// Update user role
export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const newUserData = {
    name: req.body.name,
    email: req.body.email,
    gender: req.body.gender,
    role: req.body.role,
  };

  const user = await User.findByIdAndUpdate(req.params.id, newUserData, {
    new: true,
    runValidators: true,
  });

  sendSuccess(res, 200, user);
});

// Delete user
export const deleteUser = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError(`User doesn't exist with id: ${req.params.id}`, 404));
    }

    await user.deleteOne();
    sendSuccess(res, 200, null, "User deleted");
  }
);

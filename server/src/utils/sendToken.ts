import { Response } from "express";
import { IUser } from "../models/userModel";
import { config } from "../config/env";
import { sendSuccess } from "./sendResponse";

/**
 * Sets the JWT as an httpOnly cookie and returns the user in the response
 * body. The token itself is intentionally left out of the JSON body -
 * httpOnly cookies exist specifically so client-side JS (and therefore an
 * XSS payload) can never read the token, and returning it here too would
 * undo that.
 */
const sendToken = (user: IUser, statusCode: number, res: Response): void => {
  const token = user.getJWTToken();

  res.cookie("token", token, {
    httpOnly: true,
    expires: new Date(Date.now() + config.cookieExpireDays * 24 * 60 * 60 * 1000),
    sameSite: "lax",
    secure: config.nodeEnv === "production",
  });

  sendSuccess(res, statusCode, { user }, "Authenticated");
};

export default sendToken;

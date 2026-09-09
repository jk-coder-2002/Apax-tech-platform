import { Response } from "express";
import { IUser } from "../models/userModel";
import { sendSuccess } from "./sendResponse";
import { AUTH_COOKIE_NAME, getLoginCookieOptions } from "./authCookie";

/**
 * Sets the JWT as an httpOnly cookie and returns the user in the response
 * body. The token itself is intentionally left out of the JSON body -
 * httpOnly cookies exist specifically so client-side JS (and therefore an
 * XSS payload) can never read the token, and returning it here too would
 * undo that.
 */
const sendToken = (user: IUser, statusCode: number, res: Response): void => {
  const token = user.getJWTToken();

  res.cookie(AUTH_COOKIE_NAME, token, getLoginCookieOptions());

  sendSuccess(res, statusCode, { user }, "Authenticated");
};

export default sendToken;

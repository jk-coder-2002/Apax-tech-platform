import { CookieOptions } from "express";
import { config, isProduction } from "../config/env";

export const AUTH_COOKIE_NAME = "token";

/**
 * Cookie attributes for the auth token - centralized so login and logout
 * always agree (a clear-cookie call with mismatched attributes can fail to
 * actually clear the cookie in some browsers).
 *
 * sameSite differs by environment on purpose: in local dev, frontend and
 * backend are different ports on the same site (localhost), so "lax" works
 * and doesn't require HTTPS. In production, frontend (Vercel) and backend
 * (Render) are on different registrable domains - a genuinely cross-site
 * request - which requires "none", and SameSite=None is only honored by
 * browsers when the cookie is also Secure (HTTPS), which both platforms
 * provide by default.
 */
export function getAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
  };
}

export function getLoginCookieOptions(): CookieOptions {
  return {
    ...getAuthCookieOptions(),
    expires: new Date(Date.now() + config.cookieExpireDays * 24 * 60 * 60 * 1000),
  };
}

import { CookieOptions } from "express";
import { config, isProduction } from "../config/env";

export const AUTH_COOKIE_NAME = "token";

/**
 * Cookie attributes for the auth token - centralized so login and logout
 * always agree (a clear-cookie call with mismatched attributes can fail to
 * actually clear the cookie in some browsers).
 *
 * sameSite is "lax" everywhere on purpose. An earlier version of this used
 * "none" in production for the (then cross-site) Vercel + Render split, but
 * that turned out to be blocked outright by Chrome/Safari's third-party
 * cookie restrictions in real testing - SameSite=None only controls
 * whether a cross-site cookie is *sent*, not whether the browser is
 * willing to *store* one from an unrelated domain in the first place, and
 * modern browsers increasingly aren't. The actual fix was routing API
 * calls through the frontend's own origin (see web/next.config.mjs's
 * rewrites), which makes this a first-party, same-site cookie again - so
 * "lax" is correct, not a compromise.
 */
export function getAuthCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
  };
}

export function getLoginCookieOptions(): CookieOptions {
  return {
    ...getAuthCookieOptions(),
    expires: new Date(Date.now() + config.cookieExpireDays * 24 * 60 * 60 * 1000),
  };
}

import { setCookie } from "hono/cookie";
import { Context } from "hono";
export function setAuthCookie(
  c: Context,
  token: string,
  isProduction: boolean
): void {
  return setCookie(c, "token", token, {
    httpOnly: false,
    sameSite: isProduction ? "None" : "Lax",
    secure: isProduction,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

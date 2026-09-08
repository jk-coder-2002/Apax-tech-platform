import { baseAPI } from "./base.api";
import { LoginResponseSchema, ValidatedLoginResponse } from "@/lib/schemas/api";

export const getMeApi = () =>
  baseAPI<ValidatedLoginResponse>("/user/me", "GET", undefined, { schema: LoginResponseSchema });

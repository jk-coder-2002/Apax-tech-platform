import { baseAPI } from "./base.api";
import { LoginResponseSchema, ValidatedLoginResponse } from "@/lib/schemas/api";

export const loginApi = (data: { email: string; password: string }) =>
  baseAPI<ValidatedLoginResponse>("/user/login", "POST", data, { schema: LoginResponseSchema });

export const logoutApi = () => baseAPI<null>("/user/logout", "GET");

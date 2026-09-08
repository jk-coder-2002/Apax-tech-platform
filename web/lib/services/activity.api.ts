import { baseAPI } from "./base.api";
import { ActivityResponseSchema, ValidatedActivityResponse } from "@/lib/schemas/api";

export const getActivityApi = (signal?: AbortSignal) =>
  baseAPI<ValidatedActivityResponse>("/api/activity", "GET", undefined, {
    signal,
    schema: ActivityResponseSchema,
  });

import { baseAPI } from "./base.api";
import { HoldingsResponseSchema, ValidatedHoldingsResponse } from "@/lib/schemas/api";

export const getHoldingsApi = (signal?: AbortSignal) =>
  baseAPI<ValidatedHoldingsResponse>("/api/holdings", "GET", undefined, {
    signal,
    schema: HoldingsResponseSchema,
  });

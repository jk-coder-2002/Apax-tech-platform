import { z } from "zod";

// Runtime mirrors of shared/types/api.ts, used to validate responses at the
// API boundary before they enter any store. shared/ stays dependency-free
// (it's imported by the server too) so these schemas live here instead of
// there; if the two drift, the exported types below - not the hand-written
// ones in shared/types/api.ts - are what the frontend actually trusts.

export const AssetTypeSchema = z.enum(["gold", "silver", "platinum"]);

export const AuthUserSchema = z.object({
  _id: z.string(),
  name: z.string(),
  email: z.string(),
  gender: z.string(),
  role: z.string(),
});

export const LoginResponseSchema = z.object({
  user: AuthUserSchema,
});

export const HoldingSchema = z.object({
  assetType: AssetTypeSchema,
  amount: z.number(),
  updatedAt: z.string(),
});

export const HoldingsResponseSchema = z.object({
  holdings: z.array(HoldingSchema),
});

export const ActivitySchema = z.object({
  id: z.string(),
  event: z.string(),
  details: z.string(),
  txHash: z.string(),
  timestamp: z.string(),
});

export const ActivityResponseSchema = z.object({
  activity: z.array(ActivitySchema),
});

export type ValidatedAuthUser = z.infer<typeof AuthUserSchema>;
export type ValidatedLoginResponse = z.infer<typeof LoginResponseSchema>;
export type ValidatedHoldingsResponse = z.infer<typeof HoldingsResponseSchema>;
export type ValidatedActivityResponse = z.infer<typeof ActivityResponseSchema>;

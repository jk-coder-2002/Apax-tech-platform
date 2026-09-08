// The API contract shared by web/ and server/. Defined once here so the
// frontend never has to guess a response shape or cast it into existence.

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  stack?: string;
}

// ---- Auth ----

export interface AuthUserDTO {
  _id: string;
  name: string;
  email: string;
  gender: string;
  role: string;
}

export interface LoginResponse {
  user: AuthUserDTO;
}

// ---- Holdings (Task 2B) ----

export type AssetType = "gold" | "silver" | "platinum";

export interface HoldingDTO {
  assetType: AssetType;
  amount: number; // grams
  updatedAt: string; // ISO date string
}

export interface HoldingsResponse {
  holdings: HoldingDTO[];
}

// ---- Activity feed (Task 1B: "recent activity") ----

export interface ActivityDTO {
  id: string;
  event: string;
  details: string;
  txHash: string;
  timestamp: string; // ISO date string
}

export interface ActivityResponse {
  activity: ActivityDTO[];
}

// ---- Legacy demo stubs (routes/balance.ts, routes/activity.ts) ----
// Unrelated to the gold/silver/platinum portfolio - kept as-is, documented
// in the README as a known route-prefix inconsistency.

export interface Deposit {
  id: number;
  user: string;
  amount: number;
  date: string;
}

export interface Withdrawal {
  id: number;
  user: string;
  amount: number;
  date: string;
}

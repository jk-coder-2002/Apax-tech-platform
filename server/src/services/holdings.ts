import { Types } from "mongoose";
import Holding from "../models/holdingModel";
import { HoldingDTO } from "@shared/types/api";

export async function getHoldingsForUser(userId: Types.ObjectId): Promise<HoldingDTO[]> {
  const holdings = await Holding.find({ userId }).sort({ assetType: 1 });

  return holdings.map((holding) => ({
    assetType: holding.assetType,
    amount: holding.amount,
    updatedAt: holding.updatedAt.toISOString(),
  }));
}

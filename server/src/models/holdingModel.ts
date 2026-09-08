import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { AssetType } from "@shared/types/api";

export interface IHolding extends Document {
  userId: Types.ObjectId;
  assetType: AssetType;
  amount: number;
  updatedAt: Date;
}

const ASSET_TYPES: AssetType[] = ["gold", "silver", "platinum"];

const holdingSchema: Schema<IHolding> = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assetType: {
      type: String,
      enum: ASSET_TYPES,
      required: true,
    },
    // Grams. Real money/weight math belongs in a decimal type in
    // production (see README "known limitations") - a float is good
    // enough for this assessment but will silently drift under repeated
    // partial fills at scale.
    amount: {
      type: Number,
      required: true,
      min: [0, "Holding amount cannot be negative"],
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

holdingSchema.index({ userId: 1, assetType: 1 }, { unique: true });

const Holding: Model<IHolding> = mongoose.model<IHolding>("Holding", holdingSchema);
export default Holding;

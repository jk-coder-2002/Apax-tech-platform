import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IActivity extends Document {
  userId: Types.ObjectId;
  event: string;
  details: string;
  txHash: string;
  createdAt: Date;
}

const activitySchema: Schema<IActivity> = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    event: {
      type: String,
      required: true,
    },
    details: {
      type: String,
      required: true,
    },
    txHash: {
      type: String,
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Activity: Model<IActivity> = mongoose.model<IActivity>("Activity", activitySchema);
export default Activity;

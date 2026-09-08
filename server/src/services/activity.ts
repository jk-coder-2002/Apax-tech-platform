import { Types } from "mongoose";
import Activity from "../models/activityModel";
import { ActivityDTO } from "@shared/types/api";

const RECENT_ACTIVITY_LIMIT = 20;

export async function getRecentActivityForUser(userId: Types.ObjectId): Promise<ActivityDTO[]> {
  const entries = await Activity.find({ userId })
    .sort({ createdAt: -1 })
    .limit(RECENT_ACTIVITY_LIMIT);

  return entries.map((entry) => ({
    id: entry._id.toString(),
    event: entry.event,
    details: entry.details,
    txHash: entry.txHash,
    timestamp: entry.createdAt.toISOString(),
  }));
}

import mongoose from "mongoose";
import { config } from "../config/env";
import User from "../models/userModel";
import Holding from "../models/holdingModel";
import Activity from "../models/activityModel";

const DEMO_EMAIL = "demo@apax.institutional";
const DEMO_PASSWORD = "ApaxDemo123!";

async function seed(): Promise<void> {
  await mongoose.connect(config.mongoUri);
  console.log("Connected to MongoDB for seeding");

  let user = await User.findOne({ email: DEMO_EMAIL });

  if (!user) {
    user = await User.create({
      name: "Demo Client",
      email: DEMO_EMAIL,
      gender: "unspecified",
      password: DEMO_PASSWORD,
    });
    console.log(`Created demo user: ${DEMO_EMAIL}`);
  } else {
    console.log(`Demo user already exists: ${DEMO_EMAIL}`);
  }

  await Holding.deleteMany({ userId: user._id });
  await Holding.insertMany([
    { userId: user._id, assetType: "gold", amount: 156.75 },
    { userId: user._id, assetType: "silver", amount: 892.4 },
    { userId: user._id, assetType: "platinum", amount: 45.2 },
  ]);
  console.log("Seeded holdings: gold, silver, platinum");

  await Activity.deleteMany({ userId: user._id });
  await Activity.insertMany([
    {
      userId: user._id,
      event: "Vault Verification",
      details: "All reserves verified against token supply",
      txHash: "0x8f4e0000000000000000000000000000000000000000000000000000003a2b",
    },
    {
      userId: user._id,
      event: "Token Mint",
      details: "250 APX-i tokens minted",
      txHash: "0x7c3d0000000000000000000000000000000000000000000000000000009e1f",
    },
    {
      userId: user._id,
      event: "Gold Deposit",
      details: "100g gold added to vault",
      txHash: "0x2a5b00000000000000000000000000000000000000000000000000000007d4c",
    },
  ]);
  console.log("Seeded 3 activity entries");

  console.log("\nDemo credentials:");
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);

  await mongoose.connection.close();
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});

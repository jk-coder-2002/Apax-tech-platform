import mongoose from "mongoose";
import { config } from "./env";

const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log("Mongoose Connected");
  } catch (error) {
    console.error("Mongoose connection error:", error);
    process.exit(1);
  }
};

export default connectDatabase;
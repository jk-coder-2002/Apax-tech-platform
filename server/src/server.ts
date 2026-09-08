import mongoose from "mongoose";
import app from "./app";
import { config } from "./config/env";
import connectDatabase from "./config/database";

process.on("uncaughtException", (error: Error) => {
  console.error("Uncaught Exception, shutting down:", error);
  process.exit(1);
});

async function start(): Promise<void> {
  await connectDatabase();

  const server = app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port} (${config.nodeEnv})`);
  });

  process.on("unhandledRejection", (error: Error) => {
    console.error("Unhandled Rejection, shutting down:", error);
    server.close(() => process.exit(1));
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start();

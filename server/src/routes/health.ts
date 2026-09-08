import express, { Router, Request, Response } from "express";
import mongoose from "mongoose";

const router: Router = express.Router();

const READY_STATES: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

router.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "ok",
    data: {
      uptimeSeconds: process.uptime(),
      db: READY_STATES[mongoose.connection.readyState] ?? "unknown",
    },
  });
});

export default router;

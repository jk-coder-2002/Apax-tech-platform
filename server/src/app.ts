import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { isProduction } from "./config/env";
import { allowedOrigins } from "./config/cors";
import userRoutes from "./routes/users";
import balanceRoutes from "./routes/balance";
import activityRoutes from "./routes/activity";
import apiRoutes from "./routes/api";
import healthRoutes from "./routes/health";
import notFound from "./middlewares/notFound";
import errorHandler from "./middlewares/errorHandler";

const app: Application = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      }
    },
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "10kb" }));

if (!isProduction) {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${req.method} ${req.originalUrl}`);
    next();
  });
}

app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Backend is running!" });
});

app.use("/health", healthRoutes);

// Legacy routes, kept as-is from the original template (see README for the
// /user vs /api route-prefix inconsistency this deliberately preserves).
app.use("/user", userRoutes);
app.use("/balance", balanceRoutes);
app.use("/activity", activityRoutes);

// New routes, as named in the brief.
app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

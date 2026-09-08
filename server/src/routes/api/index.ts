import express, { Router } from "express";
import holdingsRouter from "./holdings";
import activityRouter from "./activity";

const router: Router = express.Router();

router.use("/holdings", holdingsRouter);
router.use("/activity", activityRouter);

export default router;

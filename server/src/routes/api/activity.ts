import express, { Router } from "express";
import { getRecentActivity } from "../../controllers/activityController";
import { isAuthenticatedUser } from "../../middlewares/auth";

const router: Router = express.Router();

router.get("/", isAuthenticatedUser, getRecentActivity);

export default router;

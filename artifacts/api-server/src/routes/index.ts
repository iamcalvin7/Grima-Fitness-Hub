import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import profileRouter from "./profile";
import accountRouter from "./account";
import oauthRouter from "./oauth";
import storageRouter from "./storage";
import contentRouter from "./content";
import proposalFeaturesRouter from "./proposalFeatures";
import auditRouter from "./audit";
import trainingBookingsRouter from "./trainingBookings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(profileRouter);
router.use(accountRouter);
router.use(oauthRouter);
router.use(storageRouter);
router.use(contentRouter);
router.use(proposalFeaturesRouter);
router.use(auditRouter);
router.use(trainingBookingsRouter);

export default router;

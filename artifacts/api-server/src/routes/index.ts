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
import availabilityRouter from "./availability";
import notificationsRouter from "./notifications";
import commercialRouter from "./commercial";
import walletTopUpsRouter from "./walletTopUps";

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
router.use(availabilityRouter);
router.use(notificationsRouter);
router.use(commercialRouter);
router.use(walletTopUpsRouter);

export default router;

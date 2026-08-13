import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import profileRouter from "./profile";
import accountRouter from "./account";
import oauthRouter from "./oauth";
import storageRouter from "./storage";
import contentRouter from "./content";
import proposalFeaturesRouter from "./proposalFeatures";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(profileRouter);
router.use(accountRouter);
router.use(oauthRouter);
router.use(storageRouter);
router.use(contentRouter);
router.use(proposalFeaturesRouter);

export default router;

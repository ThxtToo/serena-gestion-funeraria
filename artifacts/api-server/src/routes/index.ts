import { Router, type IRouter } from "express";
import authRouter from "./auth";
import healthRouter from "./health";
import serviceOfferingsRouter from "./service-offerings";
import serviceRequestsRouter from "./service-requests";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(serviceOfferingsRouter);
router.use(serviceRequestsRouter);

export default router;

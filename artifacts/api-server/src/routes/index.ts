import { Router, type IRouter } from "express";
import adminServiceRequestsRouter from "./admin-service-requests";
import agentRouter from "./agent";
import authRouter from "./auth";
import demoPoliciesRouter from "./demo-policies";
import healthRouter from "./health";
import inventoryRouter from "./inventory";
import resourcesRouter from "./resources";
import serviceOfferingsRouter from "./service-offerings";
import serviceRequestsRouter from "./service-requests";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(serviceOfferingsRouter);
router.use(serviceRequestsRouter);
router.use(adminServiceRequestsRouter);
router.use(inventoryRouter);
router.use(resourcesRouter);
router.use(demoPoliciesRouter);
router.use(agentRouter);

export default router;

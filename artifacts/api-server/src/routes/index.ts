import { Router, type IRouter } from "express";
import healthRouter from "./health";
import serviceRequestsRouter from "./service-requests";

const router: IRouter = Router();

router.use(healthRouter);
router.use(serviceRequestsRouter);

export default router;
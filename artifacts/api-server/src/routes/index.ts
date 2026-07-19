import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import shopsRouter from "./shops.js";
import servicesRouter from "./services.js";
import bookingsRouter from "./bookings.js";
import storageRouter from "./storage.js";
import barbersRouter from "./barbers.js";
import { adminRouter } from "./admin/index.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(shopsRouter);
router.use(servicesRouter);
router.use(bookingsRouter);
router.use(storageRouter);
router.use(barbersRouter);
router.use("/admin", adminRouter);

export default router;

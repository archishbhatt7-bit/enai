import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import shopsRouter from "./shops";
import servicesRouter from "./services";
import bookingsRouter from "./bookings";
import storageRouter from "./storage";
import barbersRouter from "./barbers";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(shopsRouter);
router.use(servicesRouter);
router.use(bookingsRouter);
router.use(storageRouter);
router.use(barbersRouter);

export default router;

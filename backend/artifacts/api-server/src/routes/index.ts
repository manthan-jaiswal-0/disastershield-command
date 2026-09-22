import { Router, type IRouter } from "express";
import apiRouter from "./api";

const router: IRouter = Router();
router.use(apiRouter);

export default router;

import express from "express";
import almanacRouter from "../domains/almanac/routes";
import healthRouter from "../domains/health/routes";

const apiRouter = express.Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/almanac", almanacRouter);

export default apiRouter;

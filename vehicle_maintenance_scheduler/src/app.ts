import express from "express";

import { schedulerRouter } from "./routes/scheduler.routes";

export const app = express();

app.use(express.json());
app.use("/schedule", schedulerRouter);

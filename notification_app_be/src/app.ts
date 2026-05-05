import express from "express";

import { notificationRouter } from "./routes/notification.routes";

export const app = express();

app.use(express.json());
app.use("/notifications", notificationRouter);

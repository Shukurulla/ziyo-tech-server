import express from "express";
import cors from "cors";
import { config } from "dotenv";
import mongoose from "mongoose";
config();
import StudentRouter from "./routes/student.routes.js";
import uploadRouter from "./routes/upload.js";
import tokenRouter from "./routes/token.js";
import videoRouter from "./routes/video.routes.js";
import testRouter from "./routes/testRouter.js";
import practiceRouter from "./routes/practiceRoutes.js";
import teacherRouter from "./routes/teacher.routes.js";
import videoWorkRouter from "./routes/videoWork.routes.js";
import practiceWorkRouter from "./routes/practiceWork.routes.js";
import materialRouter from "./routes/material.routes.js";
import submissionRouter from "./routes/submissionsRoutes.js";
import evalutionRouter from "./routes/evalutionRoutes.js";
import notificationRouter from "./routes/notificationRoutes.js";
import fetch from "node-fetch";
const app = express();

app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("database connected");
});

app.use("/api/student", StudentRouter);
app.use("/api/teacher", teacherRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/token", tokenRouter);
app.use("/api/video", videoRouter);

app.use("/api/practices", practiceRouter);
app.use("/api/tests", testRouter);
app.use("/api/videoWork", videoWorkRouter);
app.use("/api/practiceWork", practiceWorkRouter);
app.use("/api/evaluation", evalutionRouter);
app.use("/api/submissions", submissionRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api", materialRouter);

app.get("/proxy", async (req, res) => {
  const fileUrl = req.query.url;
  if (!fileUrl || !fileUrl.startsWith("https://kepket.uz/")) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  try {
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error("Failed to fetch file");

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const disposition = response.headers.get("content-disposition") || "inline";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", disposition);

    response.body.pipe(res);
  } catch (error) {
    res.status(500).json({ error: "Proxy failed" });
  }
});

app.listen(process.env.PORT, () => {
  console.log(`server has ben started on port ${process.env.PORT}`);
});

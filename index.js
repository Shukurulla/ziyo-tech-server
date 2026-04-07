import express from "express";
import cors from "cors";
import { config } from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { multerErrorHandler } from "./utils/multerConfig.js";
import loggerMiddleware from "./utils/logger.js";
import fs from "fs";

// Import routes
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
import questionRouter from "./routes/question.js";
import chatRouter from "./routes/chat.routes.js";
import MaterialModel from "./model/material.model.js";
import videoWorkModel from "./model/videoWork.model.js";
import practiceModel from "./model/practiceModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config();

const app = express();

// =====================
// CORS KONFIGURATSIYASI
// =====================
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.header("Access-Control-Allow-Origin", origin || "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Logger
app.use(loggerMiddleware);

// Body parsing
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =====================
// MONGO DB GA ULANISH
// =====================
mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log("✅ Database connected");
});

// =====================
// Upload papkalarini yaratish
// =====================
const uploadDirs = [
  "uploads",
  "uploads/videos",
  "uploads/audios",
  "uploads/presentations",
  "uploads/files",
  "uploads/thumbnails",
  "uploads/others",
];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// =====================
// Health check route
// =====================
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    cors: "enabled",
    timestamp: new Date().toISOString(),
  });
});

// =====================
// Domainni almashtirish uchun route
// =====================
app.get("/change-domain-data", async (req, res) => {
  try {
    const materials = await MaterialModel.updateMany(
      { fileUrl: { $regex: "^http://server\\.ziyo-tech\\.uz/api" } },
      [
        {
          $set: {
            fileUrl: {
              $replaceOne: {
                input: "$fileUrl",
                find: "http://server.ziyo-tech.uz/api",
                replacement: "https://server.ziyo-tech.uz",
              },
            },
          },
        },
      ]
    );

    const practices = await practiceModel.updateMany(
      { fileUrl: { $regex: "^http://server\\.ziyo-tech\\.uz/api" } },
      [
        {
          $set: {
            fileUrl: {
              $replaceOne: {
                input: "$fileUrl",
                find: "http://server.ziyo-tech.uz/api",
                replacement: "https://server.ziyo-tech.uz",
              },
            },
          },
        },
      ]
    );

    // Update videoWork URLs from /uploads/files/ to /uploads/others/
    const videoWorks = await videoWorkModel.updateMany(
      { "works.fileUrl": { $regex: "/uploads/files/" } },
      [
        {
          $set: {
            "works.$[].fileUrl": {
              $replaceOne: {
                input: "$works.fileUrl",
                find: "/uploads/files/",
                replacement: "/uploads/others/",
              },
            },
          },
        },
      ]
    );

    res.status(200).json({
      status: "success",
      materials,
      practices,
      videoWorks,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

// =====================
// ROUTES
// =====================
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
app.use("/api/questions", questionRouter);
app.use("/api/chat", chatRouter);

// =====================
// Error handlers
// =====================
app.use(multerErrorHandler);

app.use((err, req, res, next) => {
  console.error("❌ Global error:", err);

  // Agar javob allaqachon yuborilgan bo'lsa, hech narsa qilma
  if (res.headersSent) {
    return next(err);
  }

  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");

  res.status(500).json({
    status: "error",
    message: "Something went wrong!",
  });
});

// =====================
// SERVER START
// =====================
const PORT = 2026;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});

export default app;

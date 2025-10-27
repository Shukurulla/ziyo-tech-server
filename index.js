import express from "express";
import cors from "cors";
import { config } from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { multerErrorHandler } from "./utils/multerConfig.js";
import fs from "fs";

// Routers
import glossaryRouter from "./routes/glossary.routes.js";
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

// Models va utils
import MaterialModel from "./model/material.model.js";
import videoWorkModel from "./model/videoWork.model.js";
import practiceModel from "./model/practiceModel.js";
import migrateFileUrls from "./utils/migrateUrls.js";

// Fayl yo‘llari
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .env yuklash
config();

const app = express();

// =====================
// ✅ CORS TO‘G‘RI KONFIGURATSIYASI
// =====================
const allowedOrigins = [
  "http://localhost:5173", // frontend dev
  "https://ziyo-tech.uz", // asosiy frontend
  "https://server.ziyo-tech.uz", // backend domen
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Agar origin yo‘q bo‘lsa (masalan, Postman yoki server ichidan) — ruxsat ber
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// =====================
// BODY PARSING
// =====================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// =====================
// STATIC FILES
// =====================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =====================
// MONGO DB ULANISH
// =====================
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ Database connected");

    try {
      await migrateFileUrls();
    } catch (error) {
      console.error("URL migration failed:", error);
    }
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// =====================
// UPLOAD PAPKALARINI YARATISH
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
// HEALTH CHECK ROUTE
// =====================
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    cors: "enabled",
    timestamp: new Date().toISOString(),
  });
});

// =====================
// DOMAINNI ALMASHTIRISH ROUTE
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
app.use("/api", glossaryRouter);
app.use("/api/chat", chatRouter);

// =====================
// ERROR HANDLERS
// =====================
app.use(multerErrorHandler);

app.use((err, req, res, next) => {
  console.error("❌ Global error:", err);

  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");

  res.status(500).json({
    status: "error",
    message: err.message || "Something went wrong!",
  });
});

// =====================
// SERVER START
// =====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
});

export default app;

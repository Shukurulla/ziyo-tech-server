import express from "express";
import cors from "cors";
import { config } from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { multerErrorHandler } from "./utils/multerConfig.js";

// Get current directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config();

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

const app = express();

// CORS konfiguratsiyasi - MUHIM!
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:3001",
  "https://teacher.ziyo-tech.uz",
  "https://ziyo-tech.uz",
  "https://ziyo-tech-teacher.vercel.app",
  // Development uchun
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("CORS Origin not allowed:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    optionsSuccessStatus: 200, // Some legacy browsers choke on 204
  })
);

// Preflight handler - barcha OPTIONS so'rovlar uchun
app.options("*", (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header(
    "Access-Control-Allow-Methods",
    "GET,PUT,POST,DELETE,OPTIONS,PATCH"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Content-Length, X-Requested-With, Accept, Origin"
  );
  res.header("Access-Control-Allow-Credentials", true);
  res.header("Access-Control-Max-Age", "86400"); // 24 hours
  res.sendStatus(200);
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Create uploads directories if they don't exist
import fs from "fs";

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
    console.log(`Created directory: ${dir}`);
  }
});

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("database connected");
});

// Routes
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

// Global error handler for multer errors
app.use(multerErrorHandler);

// Global error handler
app.use((err, req, res, next) => {
  // CORS headers qo'shish error handler da ham
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", true);
  }

  console.error("Global error handler:", err);
  res.status(500).json({
    status: "error",
    message: "Something went wrong!",
  });
});

app.listen(process.env.PORT, () => {
  console.log(`server has been started on port ${process.env.PORT}`);
});

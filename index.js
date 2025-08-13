import express from "express";
import cors from "cors";
import { config } from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import { multerErrorHandler } from "./utils/multerConfig.js";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config();

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("database connected");
});

const app = express();

// PRODUCTION CORS FIX - VERCEL uchun
app.use((req, res, next) => {
  // Production doaminlar
  const allowedOrigins = [
    "https://ziyo-tech-student.vercel.app",
    "https://ziyo-tech-teacher.vercel.app",
    "https://ziyo-tech.uz",
    "https://www.ziyo-tech.uz",
    "https://teacher.ziyo-tech.uz",
    "https://student.ziyo-tech.uz",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://localhost:5174",
  ];

  const origin = req.headers.origin;

  // Har doim CORS headers qo'yish
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    // Agar origin allowed origins ichida bo'lmasa ham, * qo'yish
    res.header("Access-Control-Allow-Origin", "*");
  }

  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,PUT,POST,DELETE,PATCH,OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma,Expires"
  );
  res.header("Access-Control-Max-Age", "86400");

  // OPTIONS requests uchun
  if (req.method === "OPTIONS") {
    console.log("CORS Preflight request for:", req.url);
    return res.status(200).end();
  }

  console.log(`Request: ${req.method} ${req.url} from origin: ${origin}`);
  next();
});

// Additional CORS with cors package
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://ziyo-tech-student.vercel.app",
      "https://ziyo-tech-teacher.vercel.app",
      "https://ziyo-tech.uz",
      "https://www.ziyo-tech.uz",
      "https://teacher.ziyo-tech.uz",
      "https://student.ziyo-tech.uz",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:5173",
      "http://localhost:5174",
    ];

    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS: Origin ${origin} not allowed`);
      // Production muhitida ham ruxsat berish
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
    "Pragma",
    "Expires",
  ],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Create upload directories
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

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    cors: "enabled",
    timestamp: new Date().toISOString(),
  });
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

// Error handlers
app.use(multerErrorHandler);

app.use((err, req, res, next) => {
  console.error("Global error:", err);

  // CORS error headers
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }

  res.status(500).json({
    status: "error",
    message: "Something went wrong!",
  });
});

// 404 handler
app.use("*", (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }

  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

export default app;

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

// VPS PRODUCTION CORS KONFIGURATSIYASI
const allowedOrigins = [
  "https://ziyo-tech-student.vercel.app",
  "https://ziyo-tech-teacher.vercel.app",
  "https://ziyo-tech.uz",
  "https://www.ziyo-tech.uz",
  "https://teacher.ziyo-tech.uz",
  "https://student.ziyo-tech.uz",
  "https://www.teacher.ziyo-tech.uz",
  "https://www.student.ziyo-tech.uz",
  // Development
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://localhost:5174",
  // VPS IP manzili (agar kerak bo'lsa)
  "http://185.197.195.71:4522",
  "https://185.197.195.71:4522",
];

// Pre-flight middleware (eng yuqorida)
app.use((req, res, next) => {
  const origin = req.headers.origin;

  console.log(
    `${new Date().toISOString()} - ${req.method} ${
      req.url
    } from origin: ${origin}`
  );

  // Ruxsat etilgan originlarni tekshirish
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else if (!origin) {
    // Origin bo'lmagan so'rovlar uchun (masalan, Postman)
    res.header("Access-Control-Allow-Origin", "*");
  } else {
    // Noma'lum originlar uchun ham ruxsat berish (production debug uchun)
    console.log(`Warning: Unknown origin ${origin} - allowing anyway`);
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,PUT,POST,DELETE,PATCH,OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma,Expires,X-CSRF-Token"
  );
  res.header("Access-Control-Max-Age", "86400"); // 24 hours

  // OPTIONS preflight requests
  if (req.method === "OPTIONS") {
    console.log(`CORS Preflight handled for: ${req.url}`);
    return res.status(200).end();
  }

  next();
});

// CORS middleware with package
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      console.log("Request without origin - allowing");
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      console.log(`CORS: Origin ${origin} allowed`);
      callback(null, true);
    } else {
      console.log(
        `CORS: Origin ${origin} not in allowed list - allowing anyway for debug`
      );
      // Production debug uchun hamma originlarga ruxsat
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
    "X-CSRF-Token",
  ],
  exposedHeaders: ["set-cookie"],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Trust proxy (VPS load balancer uchun)
app.set("trust proxy", 1);

// Body parsing middleware
app.use(
  express.json({
    limit: "50mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "50mb",
    parameterLimit: 100000,
  })
);

// Security headers
app.use((req, res, next) => {
  res.header("X-Frame-Options", "DENY");
  res.header("X-Content-Type-Options", "nosniff");
  res.header("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Static files middleware
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, path) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

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

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    cors: "enabled",
    timestamp: new Date().toISOString(),
    server: "VPS",
    origin: req.headers.origin,
    userAgent: req.headers["user-agent"],
  });
});

// API Routes
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

// Global error handler for multer
app.use(multerErrorHandler);

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);

  // Ensure CORS headers in error responses
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || !origin) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
  }

  // CORS specific errors
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      status: "error",
      message: "CORS policy violation",
      origin: origin,
    });
  }

  res.status(500).json({
    status: "error",
    message: "Something went wrong!",
  });
});

// 404 handler
app.use("*", (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || !origin) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
  }

  res.status(404).json({
    status: "error",
    message: "Route not found",
    path: req.originalUrl,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server has been started on port ${PORT}`);
  console.log(`Allowed CORS origins: ${allowedOrigins.length} domains`);
  console.log("CORS debugging enabled");
});

export default app;

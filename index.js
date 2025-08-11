// Updated index.js to fix CORS and file size issues
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
import questionRouter from "./routes/question.js";
import chatRouter from "./routes/chat.routes.js";

const app = express();

// CORS konfiguratsiyasini yaxshilash
app.use(
  cors({
    origin: [
      "https://ziyo-tech-teacher.vercel.app",
      "https://ziyo-tech-student.vercel.app",
      "http://localhost:3000",
      "http://localhost:5173",
      "*", // Development uchun, production da olib tashlang
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Preflight so'rovlarini to'g'ri ishlov berish
app.options("*", cors());

// Body parser konfiguratsiyasi - fayl hajmini oshirish
app.use(
  express.json({
    limit: "500mb",
    extended: true,
  })
);
app.use(
  express.urlencoded({
    limit: "500mb",
    extended: true,
    parameterLimit: 100000,
  })
);

// Request size limit middleware
app.use((req, res, next) => {
  if (req.method === "POST" || req.method === "PUT") {
    req.setTimeout(5 * 60 * 1000); // 5 minutes timeout
  }
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("database connected");
  })
  .catch((err) => {
    console.error("Database connection error:", err);
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      status: "error",
      message: "Fayl hajmi juda katta. Maksimal hajm 500MB.",
    });
  }

  res.status(500).json({
    status: "error",
    message: "Server xatosi yuz berdi",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route topilmadi",
  });
});

const PORT = process.env.PORT || 2025;

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

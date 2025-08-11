import express from "express";
import multer from "multer";
import Client from "ssh2-sftp-client";
import videoModel from "../model/video.model.js";
import { getAccessToken } from "../utils/apiVideoAuth.js";

const router = express.Router();

// Multer konfiguratsiyasini yaxshilash
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB
    files: 10, // maksimal 10 ta fayl
    fieldSize: 50 * 1024 * 1024, // 50MB har bir field uchun
  },
  fileFilter: (req, file, cb) => {
    // Ruxsat etilgan fayl turlari
    const allowedTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/mp3",
      "audio/mp4",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(`Fayl turi qo'llab-quvvatlanmaydi: ${file.mimetype}`),
        false
      );
    }
  },
});

const sftpConfig = {
  host: "45.134.39.117",
  port: 22,
  username: "root",
  password: process.env.SERVER_PASSWORD || "CH7aQhydDipRB9b1Jjrv",
};

// Multer error handling middleware
const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        status: "error",
        message: "Fayl hajmi juda katta. Maksimal hajm 500MB.",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        status: "error",
        message: "Juda ko'p fayllar yuborildi. Maksimal 10 ta fayl.",
      });
    }
    return res.status(400).json({
      status: "error",
      message: `Multer xatosi: ${err.message}`,
    });
  }

  if (err.message.includes("Fayl turi qo'llab-quvvatlanmaydi")) {
    return res.status(400).json({
      status: "error",
      message: err.message,
    });
  }

  next(err);
};

// Upload route with better error handling and progress tracking
router.post(
  "/",
  (req, res, next) => {
    // Request timeout ni oshirish
    req.setTimeout(10 * 60 * 1000); // 10 minutes
    res.setTimeout(10 * 60 * 1000); // 10 minutes
    next();
  },
  upload.fields([
    { name: "audios", maxCount: 5 },
    { name: "presentations", maxCount: 5 },
  ]),
  multerErrorHandler,
  async (req, res) => {
    let sftp = null;

    try {
      const { title, description, video } = req.body;

      // Validate required fields
      if (!title || !description || !video) {
        return res.status(400).json({
          status: "error",
          message: "Title, description va video ma'lumotlari majburiy",
        });
      }

      let parsedVideo;
      try {
        parsedVideo = JSON.parse(video);
      } catch (parseErr) {
        return res.status(400).json({
          status: "error",
          message: "Video ma'lumotlari noto'g'ri formatda",
        });
      }

      const timestamp = Date.now();

      // SFTP connection with retry logic
      sftp = new Client();
      let connectionAttempts = 0;
      const maxAttempts = 3;

      while (connectionAttempts < maxAttempts) {
        try {
          await sftp.connect(sftpConfig);
          console.log("SFTP connected successfully");
          break;
        } catch (connectErr) {
          connectionAttempts++;
          console.warn(
            `SFTP connection attempt ${connectionAttempts} failed:`,
            connectErr.message
          );

          if (connectionAttempts >= maxAttempts) {
            throw new Error("SFTP serveriga ulanishda xatolik");
          }

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      const audios = {};
      const presentations = {};

      // Process audio files
      if (req.files.audios && req.files.audios.length > 0) {
        console.log(`Processing ${req.files.audios.length} audio files`);

        for (const [index, file] of req.files.audios.entries()) {
          try {
            const uniqueName = `${timestamp}-audio-${index}-${file.originalname}`;
            const remotePath = `/media/files/${uniqueName}`;

            // Create directory if it doesn't exist
            try {
              await sftp.mkdir("/media/files", true);
            } catch (dirErr) {
              if (!dirErr.message.includes("File exists")) {
                console.warn("Directory creation warning:", dirErr.message);
              }
            }

            await sftp.put(Buffer.from(file.buffer), remotePath);
            audios[file.originalname] = `http://kepket.uz${remotePath}`;

            console.log(
              `Audio file ${index + 1}/${
                req.files.audios.length
              } uploaded successfully`
            );
          } catch (fileErr) {
            console.error(
              `Error uploading audio file ${file.originalname}:`,
              fileErr.message
            );
            throw new Error(
              `Audio fayl yuklashda xatolik: ${file.originalname}`
            );
          }
        }
      }

      // Process presentation files
      if (req.files.presentations && req.files.presentations.length > 0) {
        console.log(
          `Processing ${req.files.presentations.length} presentation files`
        );

        for (const [index, file] of req.files.presentations.entries()) {
          try {
            const uniqueName = `${timestamp}-presentation-${index}-${file.originalname}`;
            const remotePath = `/media/files/${uniqueName}`;

            await sftp.put(Buffer.from(file.buffer), remotePath);
            presentations[file.originalname] = `http://kepket.uz${remotePath}`;

            console.log(
              `Presentation file ${index + 1}/${
                req.files.presentations.length
              } uploaded successfully`
            );
          } catch (fileErr) {
            console.error(
              `Error uploading presentation file ${file.originalname}:`,
              fileErr.message
            );
            throw new Error(
              `Presentation fayl yuklashda xatolik: ${file.originalname}`
            );
          }
        }
      }

      // Save to database
      const saved = await videoModel.create({
        video: parsedVideo,
        title,
        description,
        presentations,
        audios,
      });

      console.log("Video successfully saved to database");

      res.status(201).json({
        status: "success",
        message: "Video muvaffaqiyatli yuklandi",
        data: saved,
      });
    } catch (err) {
      console.error("Upload xatosi:", err.message);

      // Send appropriate error response
      if (err.message.includes("timeout")) {
        res.status(408).json({
          status: "error",
          message: "So'rov vaqti tugadi. Iltimos, qaytadan urinib ko'ring.",
        });
      } else if (err.message.includes("SFTP")) {
        res.status(503).json({
          status: "error",
          message:
            "Fayl serveriga ulanishda muammo. Iltimos, keyinroq urinib ko'ring.",
        });
      } else {
        res.status(500).json({
          status: "error",
          message: "Upload muvaffaqiyatsiz tugadi: " + err.message,
        });
      }
    } finally {
      // Clean up SFTP connection
      if (sftp) {
        try {
          await sftp.end();
          console.log("SFTP connection closed");
        } catch (closeErr) {
          console.warn("SFTP close warning:", closeErr.message);
        }
      }
    }
  }
);

// Health check endpoint for upload service
router.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Upload service is running",
    maxFileSize: "500MB",
    maxFiles: 10,
  });
});

export default router;

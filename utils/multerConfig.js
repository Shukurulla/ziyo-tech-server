import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure storage for different file types
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "uploads/";

    // Organize files by type
    if (file.fieldname === "video") {
      uploadPath += "videos/";
    } else if (file.fieldname === "audios") {
      uploadPath += "audios/";
    } else if (file.fieldname === "presentations") {
      uploadPath += "presentations/";
    } else if (file.fieldname === "file") {
      uploadPath += "files/";
    } else if (file.fieldname === "thumbnail") {
      uploadPath += "thumbnails/";
    } else {
      uploadPath += "others/";
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}-${uniqueSuffix}${ext}`);
  },
});

// File filter for security
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedMimeTypes = [
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    // Videos
    "video/mp4",
    "video/avi",
    "video/mov",
    "video/wmv",
    "video/flv",
    "video/webm",
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    // Audio
    "audio/mpeg",
    "audio/wav",
    "audio/mp3",
    "audio/ogg",
    "audio/m4a",
    // Archives
    "application/zip",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    // Others
    "text/plain",
    "application/json",
    "text/csv",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Configure multer with 1GB limit
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1GB in bytes
    files: 10, // Maximum 10 files per request
    fieldSize: 10 * 1024 * 1024, // 10MB field size
    fieldNameSize: 100, // 100 bytes field name size
    fields: 10, // Maximum 10 non-file fields
  },
});

// PROFESSIONAL CORS ERROR HANDLER
export const multerErrorHandler = (err, req, res, next) => {
  // CORS headers qo'shish - har doim
  const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://localhost:5174",
    "https://ziyo-tech.uz",
    "https://www.ziyo-tech.uz",
    "https://teacher.ziyo-tech.uz",
    "https://www.teacher.ziyo-tech.uz",
    "https://ziyo-tech-teacher.vercel.app",
    "https://ziyo-tech-student.vercel.app",
    "https://student.ziyo-tech.uz",
    "https://www.student.ziyo-tech.uz",
  ];

  const origin = req.headers.origin;

  // Set CORS headers for error responses
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, Expires"
  );

  // Handle multer errors
  if (err instanceof multer.MulterError) {
    let message = "File upload error";
    let statusCode = 400;

    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        message = "File size too large. Maximum allowed size is 1GB";
        statusCode = 413; // Payload Too Large
        break;
      case "LIMIT_FILE_COUNT":
        message = "Too many files. Maximum allowed is 10 files";
        break;
      case "LIMIT_FIELD_COUNT":
        message = "Too many fields";
        break;
      case "LIMIT_UNEXPECTED_FILE":
        message = `Unexpected field: ${err.field}`;
        break;
      case "LIMIT_PART_COUNT":
        message = "Too many parts";
        break;
      case "LIMIT_FIELD_SIZE":
        message = "Field size too large";
        break;
      case "LIMIT_FIELD_KEY":
        message = "Field name too long";
        break;
      default:
        message = err.message;
    }

    return res.status(statusCode).json({
      status: "error",
      message: message,
      code: err.code,
    });
  }

  // Handle file type errors
  if (
    err.message &&
    err.message.includes("File type") &&
    err.message.includes("not allowed")
  ) {
    return res.status(415).json({
      // Unsupported Media Type
      status: "error",
      message: err.message,
    });
  }

  // Handle other upload-related errors
  if (
    err.message &&
    (err.message.includes("upload") || err.message.includes("file"))
  ) {
    return res.status(400).json({
      status: "error",
      message: "File upload failed: " + err.message,
    });
  }

  next(err);
};

// Different upload configurations for different use cases
export const videoUpload = upload.fields([
  { name: "video", maxCount: 1 },
  { name: "audios", maxCount: 5 },
  { name: "presentations", maxCount: 5 },
]);

export const materialUpload = upload.fields([
  { name: "file", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

export const practiceUpload = upload.single("file");

export const singleFileUpload = upload.single("file");

export const multipleFilesUpload = upload.array("files", 10);

export default upload;

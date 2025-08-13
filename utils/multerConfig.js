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

// Error handling middleware for multer
export const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    let message = "File upload error";

    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        message = "File size too large. Maximum allowed size is 1GB";
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

    return res.status(400).json({
      status: "error",
      message: message,
    });
  }

  if (
    err.message.includes("File type") &&
    err.message.includes("not allowed")
  ) {
    return res.status(400).json({
      status: "error",
      message: err.message,
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

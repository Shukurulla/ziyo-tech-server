import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import Client from "ssh2-sftp-client";
import path from "path";
import MaterialModel from "../model/material.model.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// SFTP configuration
const sftpConfig = {
  host: "45.134.39.117",
  port: 22,
  username: "root",
  password: process.env.SERVER_PASSWORD || "CH7aQhydDipRB9b1Jjrv",
};

// Update material schema to include thumbnail field
if (!MaterialModel.schema.paths.thumbnailUrl) {
  MaterialModel.schema.add({
    thumbnailUrl: { type: String },
  });
}

// Multer error handling middleware
const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        status: "error",
        message: `Unexpected field: ${err.field}. Expected 'file' or 'thumbnail'.`,
      });
    }
    return res.status(400).json({
      status: "error",
      message: `Multer error: ${err.message}`,
    });
  }
  next(err);
};

// Get all materials
router.get("/materials", authMiddleware, async (req, res) => {
  try {
    const materials = await MaterialModel.find().sort({ createdAt: -1 });
    res.json({ status: "success", data: materials });
  } catch (err) {
    console.error("Error fetching materials:", err);
    res.status(500).json({ status: "error", message: "Server xatosi" });
  }
});

// Get material by ID
router.get("/materials/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ status: "error", message: "Noto'g'ri ID" });
    }
    const material = await MaterialModel.findById(id);
    if (!material) {
      return res
        .status(404)
        .json({ status: "error", message: "Material topilmadi" });
    }
    res.json({ status: "success", data: material });
  } catch (err) {
    console.error("Error fetching material:", err);
    res.status(500).json({ status: "error", message: "Server xatosi" });
  }
});

// Upload or create material
router.post(
  "/materials",
  authMiddleware,
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  multerErrorHandler,
  async (req, res) => {
    try {
      const { title, description, content, fileUrl } = req.body;
      const files = req.files;

      // Validate required fields
      if (!title || !description || !content) {
        return res.status(400).json({
          status: "error",
          message: "Sarlavha, tavsif va kontent majburiy",
        });
      }

      let fileUrlResult = "";
      let fileType = "";
      let thumbnailUrl = "";

      const sftp = new Client();
      await sftp.connect(sftpConfig);

      // Process main file if present
      if (content === "file") {
        if (!files || !files.file) {
          await sftp.end();
          return res.status(400).json({
            status: "error",
            message: "Fayl kontenti uchun fayl majburiy",
          });
        }

        const file = files.file[0];
        const timestamp = Date.now();
        const remoteFilePath = `/media/materials/${timestamp}_${file.originalname}`;

        await sftp.put(Buffer.from(file.buffer), remoteFilePath);

        fileUrlResult = `http://kepket.uz${remoteFilePath}`;
        fileType = path
          .extname(file.originalname)
          .toLowerCase()
          .replace(".", "");
      } else if (content === "link") {
        if (!fileUrl) {
          await sftp.end();
          return res.status(400).json({
            status: "error",
            message: "Havola kontenti uchun fileUrl majburiy",
          });
        }
        fileUrlResult = fileUrl;
        fileType = "link";
      } else {
        await sftp.end();
        return res.status(400).json({
          status: "error",
          message: "Noto'g'ri kontent turi: 'file' yoki 'link' bo'lishi kerak",
        });
      }

      // Process thumbnail if present
      if (files && files.thumbnail && files.thumbnail[0]) {
        const thumbnail = files.thumbnail[0];

        // Only accept image files
        if (!thumbnail.mimetype.startsWith("image/")) {
          await sftp.end();
          return res.status(400).json({
            status: "error",
            message: "Thumbnail faqat rasm bo'lishi kerak",
          });
        }

        const timestamp = Date.now();
        const remoteThumbnailPath = `/media/thumbnails/${timestamp}_${thumbnail.originalname}`;

        // Ensure thumbnails directory exists
        try {
          await sftp.mkdir("/media/thumbnails", true);
        } catch (dirErr) {
          if (!dirErr.message.includes("File exists")) {
            console.error("Thumbnail directory creation error:", dirErr);
          }
        }

        await sftp.put(Buffer.from(thumbnail.buffer), remoteThumbnailPath);

        thumbnailUrl = `http://kepket.uz${remoteThumbnailPath}`;
      }

      await sftp.end();

      const newMaterial = new MaterialModel({
        title,
        description,
        fileUrl: fileUrlResult,
        fileType,
        content,
        thumbnailUrl,
      });

      await newMaterial.save();
      res.json({ status: "success", data: newMaterial });
    } catch (err) {
      console.error("Material yuklashda xatolik:", err);
      res.status(500).json({ status: "error", message: "Server xatosi" });
    }
  }
);

// Update material
router.put(
  "/materials/:id",
  authMiddleware,
  upload.fields([
    { name: "file", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  multerErrorHandler,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        content,
        fileUrl: providedFileUrl,
        thumbnailUrl: providedThumbnailUrl,
      } = req.body;
      const files = req.files;

      // Validate ID
      if (!mongoose.isValidObjectId(id)) {
        return res
          .status(400)
          .json({ status: "error", message: "Noto'g'ri ID" });
      }

      // Find existing material
      const material = await MaterialModel.findById(id);
      if (!material) {
        return res.status(404).json({
          status: "error",
          message: "Material topilmadi",
        });
      }

      // Validate required fields
      if (!title || !description || !content) {
        return res.status(400).json({
          status: "error",
          message: "Sarlavha, tavsif va kontent majburiy",
        });
      }

      // Prepare update object
      const updateData = {
        title,
        description,
        content,
      };

      const sftp = new Client();
      await sftp.connect(sftpConfig);

      // Handle file update
      if (content === "file") {
        if (files && files.file && files.file[0]) {
          // Upload new file
          const file = files.file[0];
          const timestamp = Date.now();
          const remoteFilePath = `/media/materials/${timestamp}_${file.originalname}`;

          await sftp.put(Buffer.from(file.buffer), remoteFilePath);

          updateData.fileUrl = `http://kepket.uz${remoteFilePath}`;
          updateData.fileType = path
            .extname(file.originalname)
            .toLowerCase()
            .replace(".", "");

          // Delete old file if it exists
          if (
            material.fileUrl &&
            material.fileUrl.startsWith("http://kepket.uz")
          ) {
            try {
              const oldFilePath = material.fileUrl.replace(
                "http://kepket.uz",
                ""
              );
              await sftp.delete(oldFilePath);
            } catch (deleteErr) {
              console.warn("Error deleting old file:", deleteErr.message);
            }
          }
        } else if (providedFileUrl) {
          updateData.fileUrl = providedFileUrl;
          updateData.fileType = material.fileType;
        } else {
          await sftp.end();
          return res.status(400).json({
            status: "error",
            message: "Fayl kontenti uchun fayl yoki fileUrl majburiy",
          });
        }
      } else if (content === "link") {
        if (!providedFileUrl) {
          await sftp.end();
          return res.status(400).json({
            status: "error",
            message: "Havola kontenti uchun fileUrl majburiy",
          });
        }
        updateData.fileUrl = providedFileUrl;
        updateData.fileType = "link";

        // Delete old file if it was a file
        if (
          material.fileUrl &&
          material.fileUrl.startsWith("http://kepket.uz")
        ) {
          try {
            const oldFilePath = material.fileUrl.replace(
              "http://kepket.uz",
              ""
            );
            await sftp.delete(oldFilePath);
          } catch (deleteErr) {
            console.warn("Error deleting old file:", deleteErr.message);
          }
        }
      } else {
        await sftp.end();
        return res.status(400).json({
          status: "error",
          message: "Noto'g'ri kontent turi: 'file' yoki 'link' bo'lishi kerak",
        });
      }

      // Handle thumbnail update
      if (files && files.thumbnail && files.thumbnail[0]) {
        const thumbnail = files.thumbnail[0];

        // Only accept image files
        if (!thumbnail.mimetype.startsWith("image/")) {
          await sftp.end();
          return res.status(400).json({
            status: "error",
            message: "Thumbnail faqat rasm bo'lishi kerak",
          });
        }

        const timestamp = Date.now();
        const remoteThumbnailPath = `/media/thumbnails/${timestamp}_${thumbnail.originalname}`;

        // Ensure thumbnails directory exists
        try {
          await sftp.mkdir("/media/thumbnails", true);
        } catch (dirErr) {
          if (!dirErr.message.includes("File exists")) {
            console.error("Thumbnail directory creation error:", dirErr);
          }
        }

        await sftp.put(Buffer.from(thumbnail.buffer), remoteThumbnailPath);

        // Delete old thumbnail if it exists
        if (
          material.thumbnailUrl &&
          material.thumbnailUrl.startsWith("http://kepket.uz")
        ) {
          try {
            const oldThumbnailPath = material.thumbnailUrl.replace(
              "http://kepket.uz",
              ""
            );
            await sftp.delete(oldThumbnailPath);
          } catch (deleteErr) {
            console.warn("Error deleting old thumbnail:", deleteErr.message);
          }
        }

        updateData.thumbnailUrl = `http://kepket.uz${remoteThumbnailPath}`;
      } else if (providedThumbnailUrl) {
        updateData.thumbnailUrl = providedThumbnailUrl;
      } else if (req.body.thumbnailUrl === "") {
        // If explicitly set to empty, remove the thumbnail
        if (
          material.thumbnailUrl &&
          material.thumbnailUrl.startsWith("http://kepket.uz")
        ) {
          try {
            const oldThumbnailPath = material.thumbnailUrl.replace(
              "http://kepket.uz",
              ""
            );
            await sftp.delete(oldThumbnailPath);
          } catch (deleteErr) {
            console.warn("Error deleting old thumbnail:", deleteErr.message);
          }
        }
        updateData.thumbnailUrl = "";
      }

      await sftp.end();

      // Update material
      const updatedMaterial = await MaterialModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      res.json({
        status: "success",
        message: "Material muvaffaqiyatli yangilandi",
        data: updatedMaterial,
      });
    } catch (err) {
      console.error("Material yangilashda xatolik:", err);
      res.status(500).json({
        status: "error",
        message: "Server xatosi",
      });
    }
  }
);

// Delete material
router.delete("/materials/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ status: "error", message: "Noto'g'ri ID" });
    }

    const material = await MaterialModel.findById(id);
    if (!material) {
      return res
        .status(404)
        .json({ status: "error", message: "Material topilmadi" });
    }

    // Delete files from server
    const sftp = new Client();
    await sftp.connect(sftpConfig);

    // Delete main file
    if (material.fileUrl && material.fileUrl.startsWith("http://kepket.uz")) {
      try {
        const filePath = material.fileUrl.replace("http://kepket.uz", "");
        await sftp.delete(filePath);
      } catch (err) {
        console.warn("Error deleting file:", err.message);
      }
    }

    // Delete thumbnail
    if (
      material.thumbnailUrl &&
      material.thumbnailUrl.startsWith("http://kepket.uz")
    ) {
      try {
        const thumbnailPath = material.thumbnailUrl.replace(
          "http://kepket.uz",
          ""
        );
        await sftp.delete(thumbnailPath);
      } catch (err) {
        console.warn("Error deleting thumbnail:", err.message);
      }
    }

    await sftp.end();
    await MaterialModel.findByIdAndDelete(id);

    res.json({ status: "success", message: "Material o'chirildi" });
  } catch (err) {
    console.error("Material o'chirishda xatolik:", err);
    res.status(500).json({ status: "error", message: "Server xatosi" });
  }
});

export default router;

// Updated material.routes.js with thumbnail support
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

// Get all materials
router.get("/materials", authMiddleware, async (req, res) => {
  try {
    const materials = await MaterialModel.find().sort({ createdAt: -1 });
    res.json({ status: "success", data: materials });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Get material by ID
router.get("/materials/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const material = await MaterialModel.findById(id);
    if (!material) {
      return res
        .status(404)
        .json({ status: "error", message: "Material topilmadi" });
    }
    res.json({ status: "success", data: material });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
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
  async (req, res) => {
    try {
      const { title, description, content } = req.body;
      const files = req.files;

      if (!title || !description || !content) {
        return res.status(400).json({
          status: "error",
          message: "Title, description va content majburiy",
        });
      }

      let fileUrl = "";
      let fileType = "";
      let thumbnailUrl = "";

      const sftp = new Client();
      await sftp.connect(sftpConfig);

      // Process main file if present
      if (content === "file") {
        if (!files || !files.file) {
          return res.status(400).json({
            status: "error",
            message: "File content uchun fayl majburiy",
          });
        }

        const file = files.file[0];
        const timestamp = Date.now();
        const remoteFilePath = `/media/materials/${timestamp}_${file.originalname}`;

        await sftp.put(Buffer.from(file.buffer), remoteFilePath);

        fileUrl = `http://kepket.uz${remoteFilePath}`;
        fileType = path
          .extname(file.originalname)
          .toLowerCase()
          .replace(".", "");
      } else if (content === "link") {
        fileUrl = req.body.fileUrl || "";
        fileType = "link";
        if (!fileUrl) {
          return res.status(400).json({
            status: "error",
            message: "Link content uchun fileUrl majburiy",
          });
        }
      }

      // Process thumbnail if present
      if (files && files.thumbnail && files.thumbnail[0]) {
        const thumbnail = files.thumbnail[0];

        // Only accept image files
        if (!thumbnail.mimetype.startsWith("image/")) {
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
          if (dirErr.message.indexOf("File exists") === -1) {
            console.error("Thumbnail directory creation error:", dirErr);
          }
        }

        await sftp.put(Buffer.from(thumbnail.buffer), remoteThumbnailPath);

        thumbnailUrl = `http://kepket.uz${remoteThumbnailPath}`;
      } else if (req.body.thumbnailUrl) {
        // Use existing thumbnail URL if provided (for updates)
        thumbnailUrl = req.body.thumbnailUrl;
      }

      await sftp.end();

      const newMaterial = new MaterialModel({
        title,
        description,
        fileUrl,
        fileType,
        content,
        thumbnailUrl,
      });

      await newMaterial.save();
      res.json({ status: "success", data: newMaterial });
    } catch (err) {
      console.error("Material yuklashda xatolik:", err);
      res.status(500).json({ status: "error", message: err.message });
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

      // Find existing material
      const material = await MaterialModel.findById(id);
      if (!material) {
        return res.status(404).json({
          status: "error",
          message: "Material topilmadi",
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

          // Delete old file if it exists on the server
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
              // Continue with the update even if old file deletion fails
            }
          }
        } else if (providedFileUrl) {
          // Keep existing file URL
          updateData.fileUrl = providedFileUrl;
        }
      } else if (content === "link") {
        updateData.fileUrl = providedFileUrl || "";
        updateData.fileType = "link";
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
          if (dirErr.message.indexOf("File exists") === -1) {
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
        // Keep existing thumbnail URL
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
        message: err.message,
      });
    }
  }
);

// Delete material
router.delete("/materials/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const material = await MaterialModel.findById(id);
    if (!material) {
      return res
        .status(404)
        .json({ status: "error", message: "Material topilmadi" });
    }

    // Delete files from server
    if (
      (material.fileUrl && material.fileUrl.startsWith("http://kepket.uz")) ||
      (material.thumbnailUrl &&
        material.thumbnailUrl.startsWith("http://kepket.uz"))
    ) {
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
    }

    await MaterialModel.findByIdAndDelete(id);
    res.json({ status: "success", message: "Material o'chirildi" });
  } catch (err) {
    console.error("Material o'chirishda xatolik:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;

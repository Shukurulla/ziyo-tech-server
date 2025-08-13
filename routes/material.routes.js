import express from "express";
import { materialUpload, multerErrorHandler } from "../utils/multerConfig.js";
import MaterialModel from "../model/material.model.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import fs from "fs";
import path from "path";

const router = express.Router();

// CORS middleware for all material routes
router.use((req, res, next) => {
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
    "https://www.student.ziyo-tech.uz"
  ];

  const origin = req.headers.origin;
  
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

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  next();
});

// Get all materials
router.get("/materials", authMiddleware, async (req, res) => {
  try {
    const materials = await MaterialModel.find().sort({ createdAt: -1 });
    res.json({ status: "success", data: materials });
  } catch (err) {
    console.error("Error fetching materials:", err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Get material by ID
router.get("/materials/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const material = await MaterialModel.findById(id);
    if (!material) {
      return res.status(404).json({
        status: "error",
        message: "Material not found",
      });
    }
    res.json({ status: "success", data: material });
  } catch (err) {
    console.error("Error fetching material:", err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Create new material
router.post(
  "/materials",
  authMiddleware,
  materialUpload,
  multerErrorHandler,
  async (req, res) => {
    // Set CORS headers for response
    const origin = req.headers.origin;
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
      "https://www.student.ziyo-tech.uz"
    ];

    if (allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Credentials", "true");

    try {
      const { title, description, content, fileUrl } = req.body;
      const files = req.files;

      // Validate required fields
      if (!title || !description || !content) {
        // Clean up uploaded files if validation fails
        if (files) {
          Object.values(files)
            .flat()
            .forEach((file) => {
              fs.unlink(file.path, (err) => {
                if (err) console.error("Error deleting file:", err);
              });
            });
        }

        return res.status(400).json({
          status: "error",
          message: "Title, description and content are required",
        });
      }

      let fileUrlResult = "";
      let fileType = "";
      let thumbnailUrl = "";

      // Process main file
      if (content === "file") {
        if (!files || !files.file) {
          return res.status(400).json({
            status: "error",
            message: "File is required for file content type",
          });
        }

        const file = files.file[0];
        fileUrlResult = `${req.protocol}://${req.get("host")}/uploads/files/${
          file.filename
        }`;
        fileType = path
          .extname(file.originalname)
          .toLowerCase()
          .replace(".", "");
      } else if (content === "link") {
        if (!fileUrl) {
          return res.status(400).json({
            status: "error",
            message: "File URL is required for link content type",
          });
        }
        fileUrlResult = fileUrl;
        fileType = "link";
      } else {
        return res.status(400).json({
          status: "error",
          message: "Invalid content type. Must be 'file' or 'link'",
        });
      }

      // Process thumbnail if present
      if (files && files.thumbnail && files.thumbnail[0]) {
        const thumbnail = files.thumbnail[0];
        thumbnailUrl = `${req.protocol}://${req.get(
          "host"
        )}/uploads/thumbnails/${thumbnail.filename}`;
      }

      // Create new material
      const newMaterial = new MaterialModel({
        title,
        description,
        fileUrl: fileUrlResult,
        fileType,
        content,
        thumbnailUrl,
      });

      await newMaterial.save();
      res.json({
        status: "success",
        data: newMaterial,
        message: "Material created successfully",
      });
    } catch (err) {
      // Clean up uploaded files in case of error
      if (req.files) {
        Object.values(req.files)
          .flat()
          .forEach((file) => {
            fs.unlink(file.path, (err) => {
              if (err) console.error("Error deleting file:", err);
            });
          });
      }

      console.error("Material creation error:", err);
      res.status(500).json({
        status: "error",
        message: "Server error: " + err.message,
      });
    }
  }
);

// Update material
router.put(
  "/materials/:id",
  authMiddleware,
  materialUpload,
  multerErrorHandler,
  async (req, res) => {
    // Set CORS headers
    const origin = req.headers.origin;
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
      "https://www.student.ziyo-tech.uz"
    ];

    if (allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Credentials", "true");

    try {
      const { id } = req.params;
      const {
        title,
        description,
        content,
        fileUrl: providedFileUrl,
      } = req.body;
      const files = req.files;

      // Find existing material
      const material = await MaterialModel.findById(id);
      if (!material) {
        // Clean up uploaded files
        if (files) {
          Object.values(files)
            .flat()
            .forEach((file) => {
              fs.unlink(file.path, (err) => {
                if (err) console.error("Error deleting file:", err);
              });
            });
        }

        return res.status(404).json({
          status: "error",
          message: "Material not found",
        });
      }

      // Validate required fields
      if (!title || !description || !content) {
        return res.status(400).json({
          status: "error",
          message: "Title, description and content are required",
        });
      }

      const updateData = { title, description, content };

      // Handle file update
      if (content === "file") {
        if (files && files.file && files.file[0]) {
          // Delete old file if it exists locally
          if (material.fileUrl && material.fileUrl.includes(req.get("host"))) {
            const oldFilename = path.basename(material.fileUrl);
            const oldFilePath = path.join("uploads/files", oldFilename);
            fs.unlink(oldFilePath, (err) => {
              if (err) console.warn("Could not delete old file:", err.message);
            });
          }

          // Set new file
          const file = files.file[0];
          updateData.fileUrl = `${req.protocol}://${req.get(
            "host"
          )}/uploads/files/${file.filename}`;
          updateData.fileType = path
            .extname(file.originalname)
            .toLowerCase()
            .replace(".", "");
        } else if (providedFileUrl) {
          updateData.fileUrl = providedFileUrl;
        } else {
          return res.status(400).json({
            status: "error",
            message: "File or fileUrl is required for file content type",
          });
        }
      } else if (content === "link") {
        if (!providedFileUrl) {
          return res.status(400).json({
            status: "error",
            message: "File URL is required for link content type",
          });
        }
        updateData.fileUrl = providedFileUrl;
        updateData.fileType = "link";

        // Delete old file if switching from file to link
        if (
          material.content === "file" &&
          material.fileUrl &&
          material.fileUrl.includes(req.get("host"))
        ) {
          const oldFilename = path.basename(material.fileUrl);
          const oldFilePath = path.join("uploads/files", oldFilename);
          fs.unlink(oldFilePath, (err) => {
            if (err) console.warn("Could not delete old file:", err.message);
          });
        }
      }

      // Handle thumbnail update
      if (files && files.thumbnail && files.thumbnail[0]) {
        // Delete old thumbnail if it exists locally
        if (
          material.thumbnailUrl &&
          material.thumbnailUrl.includes(req.get("host"))
        ) {
          const oldThumbnailName = path.basename(material.thumbnailUrl);
          const oldThumbnailPath = path.join(
            "uploads/thumbnails",
            oldThumbnailName
          );
          fs.unlink(oldThumbnailPath, (err) => {
            if (err)
              console.warn("Could not delete old thumbnail:", err.message);
          });
        }

        const thumbnail = files.thumbnail[0];
        updateData.thumbnailUrl = `${req.protocol}://${req.get(
          "host"
        )}/uploads/thumbnails/${thumbnail.filename}`;
      }

      // Update material
      const updatedMaterial = await MaterialModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
      );

      res.json({
        status: "success",
        message: "Material updated successfully",
        data: updatedMaterial,
      });
    } catch (err) {
      // Clean up uploaded files in case of error
      if (req.files) {
        Object.values(req.files)
          .flat()
          .forEach((file) => {
            fs.unlink(file.path, (err) => {
              if (err) console.error("Error deleting file:", err);
            });
          });
      }

      console.error("Material update error:", err);
      res.status(500).json({
        status: "error",
        message: "Server error: " + err.message,
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
      return res.status(404).json({
        status: "error",
        message: "Material not found",
      });
    }

    // Delete main file if it's stored locally
    if (material.fileUrl && material.fileUrl.includes(req.get("host"))) {
      const filename = path.basename(material.fileUrl);
      const filePath = path.join("uploads/files", filename);
      fs.unlink(filePath, (err) => {
        if (err) console.warn("Could not delete file:", err.message);
      });
    }

    // Delete thumbnail if it's stored locally
    if (
      material.thumbnailUrl &&
      material.thumbnailUrl.includes(req.get("host"))
    ) {
      const thumbnailName = path.basename(material.thumbnailUrl);
      const thumbnailPath = path.join("uploads/thumbnails", thumbnailName);
      fs.unlink(thumbnailPath, (err) => {
        if (err) console.warn("Could not delete thumbnail:", err.message);
      });
    }

    await MaterialModel.findByIdAndDelete(id);

    res.json({
      status: "success",
      message: "Material deleted successfully",
    });
  } catch (err) {
    console.error("Material deletion error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error: " + err.message,
    });
  }
});

export default router;
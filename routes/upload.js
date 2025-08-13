// routes/upload.js - CORS kodni olib tashlangan versiya
import express from "express";
import { videoUpload, multerErrorHandler } from "../utils/multerConfig.js";
import videoModel from "../model/video.model.js";
import { getAccessToken } from "../utils/apiVideoAuth.js";
import fs from "fs";
import path from "path";

const router = express.Router();

// CORS middleware olib tashlash - index.js da global qilingan

router.post("/", videoUpload, multerErrorHandler, async (req, res) => {
  try {
    const { title, description, video } = req.body;
    const files = req.files;

    if (!files) {
      return res.status(400).json({
        status: "error",
        message: "No files uploaded",
      });
    }

    // Process audio files
    const audios = {};
    if (files.audios) {
      files.audios.forEach((file) => {
        const ext = path.extname(file.originalname);
        const fileName = `${Date.now()}${ext}`;
        const publicUrl = `${req.protocol}://${req.get(
          "host"
        )}/uploads/audios/${file.filename}`;
        audios[file.originalname] = publicUrl;
      });
    }

    // Process presentation files
    const presentations = {};
    if (files.presentations) {
      files.presentations.forEach((file) => {
        const ext = path.extname(file.originalname);
        const fileName = `${Date.now()}${ext}`;
        const publicUrl = `${req.protocol}://${req.get(
          "host"
        )}/uploads/presentations/${file.filename}`;
        presentations[file.originalname] = publicUrl;
      });
    }

    // Save to database
    const saved = await videoModel.create({
      video: JSON.parse(video),
      title,
      description,
      presentations,
      audios,
    });

    res.json({
      status: "success",
      data: saved,
      message: "Files uploaded successfully",
    });
  } catch (err) {
    console.error("Upload error:", err);

    // Clean up uploaded files on error
    if (req.files) {
      Object.values(req.files)
        .flat()
        .forEach((file) => {
          if (file.path && fs.existsSync(file.path)) {
            fs.unlink(file.path, (unlinkErr) => {
              if (unlinkErr) console.error("Error deleting file:", unlinkErr);
            });
          }
        });
    }

    res.status(500).json({
      status: "error",
      message: "Upload failed: " + err.message,
    });
  }
});

export default router;

// routes/videoWork.routes.js - Fixed version
import express from "express";
import {
  multipleFilesUpload,
  multerErrorHandler,
} from "../utils/multerConfig.js";
import videoWorkModel from "../model/videoWork.model.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import studentModel from "../model/student.model.js";
import TeacherModel from "../model/teacher.model.js";
import NotificationModel from "../model/notificationModel.js";
import fs from "fs";
import path from "path";

const router = express.Router();

// Helper function to get correct domain based on request
const getDomainFromRequest = (req) => {
  const host = req.get("host");
  if (host.includes("teacher.")) {
    return "https://teacher.ziyo-tech.uz";
  }
  return "https://ziyo-tech.uz";
};

// Upload video work files
router.post(
  "/",
  authMiddleware,
  multipleFilesUpload,
  multerErrorHandler,
  async (req, res) => {
    try {
      const { userId } = req.userData;
      const { videoId } = req.body;
      const files = req.files;

      if (!videoId) {
        // Clean up uploaded files
        if (files) {
          files.forEach((file) => {
            fs.unlink(file.path, (err) => {
              if (err) console.error("Error deleting file:", err);
            });
          });
        }

        return res.status(400).json({
          status: "error",
          message: "Video ID is required",
        });
      }

      if (!files || files.length === 0) {
        return res.status(400).json({
          status: "error",
          message: "No files uploaded",
        });
      }

      const findStudent = await studentModel.findById(userId);
      if (!findStudent) {
        // Clean up uploaded files
        files.forEach((file) => {
          fs.unlink(file.path, (err) => {
            if (err) console.error("Error deleting file:", err);
          });
        });

        return res.status(400).json({
          status: "error",
          message: "Student not found",
        });
      }

      // Get the correct domain for file URLs
      const domain = "https://ziyo-tech.uz"; //getDomainFromRequest(req);

      // Process uploaded files
      const works = [];
      for (const file of files) {
        const fileUrl = `${domain}/uploads/files/${file.filename}`;
        const fileNameWithoutExt = path.parse(file.originalname).name;

        works.push({
          title: fileNameWithoutExt,
          fileUrl: fileUrl,
        });
      }

      const newRecord = await videoWorkModel.create({
        studentId: findStudent._id,
        videoId,
        works,
      });

      // Send notification to all teachers
      const teachers = await TeacherModel.find();
      for (const teacher of teachers) {
        const notification = new NotificationModel({
          recipientId: teacher._id,
          type: "submission",
          title: `New video work: Video ID ${videoId}`,
          message: `Student ${findStudent._id} uploaded ${files.length} files for video ID ${videoId}.`,
          relatedId: newRecord._id,
          relatedType: "videoWork",
          workId: videoId,
          recipientType: "student",
        });
        await notification.save();
      }

      res.json({
        status: "success",
        data: newRecord,
        message: "Video work uploaded successfully",
      });
    } catch (err) {
      // Clean up uploaded files in case of error
      if (req.files) {
        req.files.forEach((file) => {
          fs.unlink(file.path, (err) => {
            if (err) console.error("Error deleting file:", err);
          });
        });
      }

      console.error("Error:", err);
      res.status(500).json({
        status: "error",
        message: "Upload failed: " + err.message,
      });
    }
  }
);

// Get video work by ID
router.get("/:videoId", async (req, res) => {
  try {
    const works = await videoWorkModel.findOne({ videoId: req.params.videoId });
    if (!works) {
      return res.status(404).json({
        status: "error",
        message: "No video works found for this video",
      });
    }
    res.json({ status: "success", data: works });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Server error: " + error.message,
    });
  }
});

export default router;

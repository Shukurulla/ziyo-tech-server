// routes/practiceWork.routes.js - Fixed version
import express from "express";
import { singleFileUpload, multerErrorHandler } from "../utils/multerConfig.js";
import practiceWorkModel from "../model/practiceWork.model.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import studentModel from "../model/student.model.js";
import TeacherModel from "../model/teacher.model.js";
import NotificationModel from "../model/notificationModel.js";
import practiceModel from "../model/practiceModel.js";
import fs from "fs";

const router = express.Router();

// Helper function to get correct domain based on request
const getDomainFromRequest = (req) => {
  const host = req.get("host");
  if (host.includes("teacher.")) {
    return "https://teacher.ziyo-tech.uz";
  }
  return "https://ziyo-tech.uz";
};

// Upload practice work file
router.post(
  "/upload",
  authMiddleware,
  singleFileUpload,
  multerErrorHandler,
  async (req, res) => {
    try {
      const { userId } = req.userData;
      const { practiceId } = req.body;
      const file = req.file;

      if (!file || !practiceId) {
        // Clean up uploaded file if validation fails
        if (file) {
          fs.unlink(file.path, (err) => {
            if (err) console.error("Error deleting file:", err);
          });
        }

        return res.status(400).json({
          status: "error",
          message: "File and practiceId are required",
        });
      }

      const practice = await practiceModel.findById(practiceId);
      if (!practice) {
        // Clean up uploaded file
        fs.unlink(file.path, (err) => {
          if (err) console.error("Error deleting file:", err);
        });

        return res.status(404).json({
          status: "error",
          message: "Practice not found",
        });
      }

      const student = await studentModel.findById(userId);
      if (!student) {
        // Clean up uploaded file
        fs.unlink(file.path, (err) => {
          if (err) console.error("Error deleting file:", err);
        });

        return res.status(403).json({
          status: "error",
          message: "Only students can upload files",
        });
      }

      // Get the correct domain for file URLs
      const domain = getDomainFromRequest(req);
      const fileUrl = `${domain}/uploads/files/${file.filename}`;

      const newWork = await practiceWorkModel.create({
        student: student._id,
        practice: practiceId,
        practiceTitle: practice.title,
        fileUrl,
      });

      // Send notification to all teachers
      const teachers = await TeacherModel.find();
      for (const teacher of teachers) {
        const notification = new NotificationModel({
          recipientId: teacher._id,
          type: "submission",
          title: `New practice work: Practice ID ${practiceId}`,
          message: `Student ${student._id} submitted "${file.originalname}" for practice ID ${practiceId}.`,
          relatedId: newWork._id,
          relatedType: "practiceWork",
          recipientType: "student",
          practiceTitle: newWork.practiceTitle,
          workId: practiceId,
        });
        await notification.save();
      }

      res.json({
        status: "success",
        data: newWork,
        message: "Practice work uploaded successfully",
      });
    } catch (err) {
      // Clean up uploaded file in case of error
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error deleting file:", err);
        });
      }

      console.error("File upload error:", err);
      res.status(500).json({
        status: "error",
        message: "Server error: " + err.message,
      });
    }
  }
);

export default router;

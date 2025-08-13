import express from "express";
import { practiceUpload, multerErrorHandler } from "../utils/multerConfig.js";
import Practice from "../model/practiceModel.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import studentModel from "../model/student.model.js";
import teacherModel from "../model/teacher.model.js";
import practiceWorkModel from "../model/practiceWork.model.js";
import fs from "fs";
import path from "path";

const router = express.Router();

// Create practice
router.post("/", practiceUpload, multerErrorHandler, async (req, res) => {
  try {
    const { title, description } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        status: "error",
        message: "File is required",
      });
    }

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/files/${
      file.filename
    }`;

    const newPractice = await Practice.create({
      title,
      description,
      fileUrl,
    });

    res.status(201).json({
      status: "success",
      data: newPractice,
      message: "Practice created successfully",
    });
  } catch (err) {
    // Clean up uploaded file in case of error
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    }

    console.error("Practice creation error:", err.message);
    res.status(500).json({
      status: "error",
      message: "Server error: " + err.message,
    });
  }
});

// Get practices
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.userData;

    // Check if user is student or teacher
    const student = await studentModel.findById(userId);
    const teacher = !student ? await teacherModel.findById(userId) : null;

    if (!student && !teacher) {
      return res.status(401).json({
        status: "error",
        message: "Authentication failed",
      });
    }

    const practices = await Practice.find().sort({ createdAt: -1 });

    // If user is student, check completed status
    if (student) {
      const enrichedPractices = await Promise.all(
        practices.map(async (practice) => {
          const work = await practiceWorkModel.findOne({
            student: student._id,
            practice: practice._id,
          });

          return {
            ...practice.toObject(),
            completed: !!work,
          };
        })
      );

      return res.json({ status: "success", data: enrichedPractices });
    }

    // If teacher
    res.json({ status: "success", data: practices });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Get practice by ID
router.get("/:workId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.userData;
    const { workId } = req.params;

    const student = await studentModel.findById(userId);
    const teacher = !student ? await teacherModel.findById(userId) : null;

    if (!student && !teacher) {
      return res.status(401).json({
        status: "error",
        message: "Authentication failed",
      });
    }

    const practice = await Practice.findById(workId);
    if (!practice) {
      return res.status(404).json({
        status: "error",
        message: "Practice not found",
      });
    }

    if (student) {
      const work = await practiceWorkModel.findOne({
        student: student._id,
        practice: practice._id,
      });

      return res.json({
        status: "success",
        data: {
          ...practice.toObject(),
          completed: !!work,
          ...(work ? { work: work.toObject() } : {}),
        },
      });
    }

    // Teacher
    res.json({ status: "success", data: practice });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Delete practice
router.delete("/:id", async (req, res) => {
  try {
    const practice = await Practice.findById(req.params.id);

    if (!practice) {
      return res.status(404).json({
        status: "error",
        message: "Practice not found",
      });
    }

    // Delete file if it's stored locally
    if (practice.fileUrl && practice.fileUrl.includes(req.get("host"))) {
      const filename = path.basename(practice.fileUrl);
      const filePath = path.join("uploads/files", filename);
      fs.unlink(filePath, (err) => {
        if (err) console.warn("Could not delete file:", err.message);
      });
    }

    await Practice.findByIdAndDelete(practice._id);

    res.json({
      status: "success",
      message: "Practice deleted successfully",
    });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error: " + err.message,
    });
  }
});

export default router;

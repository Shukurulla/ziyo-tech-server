import express from "express";
import mongoose from "mongoose";
import videoWorkModel from "../model/videoWork.model.js";
import practiceWorkModel from "../model/practiceWork.model.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import teacherModel from "../model/teacher.model.js";
import studentModel from "../model/student.model.js";
import videoModel from "../model/video.model.js";
import practiceModel from "../model/practiceModel.js";
import NotificationModel from "../model/notificationModel.js";

const router = express.Router();

// Fetch all submissions for teachers
router.get("/all", authMiddleware, async (req, res) => {
  const { userId } = req.userData;

  try {
    // Verify the user is a teacher
    const teacher = await teacherModel.findById(userId);
    if (!teacher) {
      return res
        .status(403)
        .json({ status: "error", message: "Faqat o‘qituvchilar ko‘ra oladi" });
    }

    // Fetch all submissions
    const videoWorks = await videoWorkModel.find();
    const practiceWorks = await practiceWorkModel.find();

    const submissions = await Promise.all([
      ...videoWorks.map(async (work) => {
        const student = await studentModel.findById(work.studentId);
        const video = await videoModel.findById(work.videoId);
        const isSended = await NotificationModel.findOne({ workId: work._id });

        return {
          type: "videoWork",
          workId: work._id,
          student: student
            ? `${student.firstname} ${student.lastname}`
            : `ID: ${work.studentId}`,
          studentId: student._id,
          title: `Video ${video.title}`,
          files: work.works.map((file) => ({
            fileUrl: file.fileUrl,
            fileName: file.title,
          })),
          submittedAt: work.createdAt,
          isSended: isSended == null ? false : true,
          rating: isSended ? isSended.rating : null,
        };
      }),
      ...practiceWorks.map(async (work) => {
        const student = await studentModel.findById(work.student);
        const practice = await practiceModel.findById(work.practice);
        const isSended = await NotificationModel.findOne({ workId: work._id });

        return {
          type: "practiceWork",
          workId: work._id,
          student: student
            ? `${student.firstname} ${student.lastname} `
            : `ID: ${work.student}`,
          studentId: student._id,
          title: `Practice: ${practice.title}`,
          files: [
            { fileUrl: work.fileUrl, fileName: work.fileUrl.split("/").pop() },
          ],
          submittedAt: work.createdAt,
          isSended: isSended == null ? false : true,
          rating: isSended ? isSended.rating : null,
        };
      }),
    ]);

    res.status(200).json({ status: "success", data: submissions });
  } catch (err) {
    console.error("Submissions fetch error:", err);
    res.status(500).json({
      status: "error",
      message: "Serverda xatolik yuz berdi: " + err.message,
    });
  }
});

export default router;

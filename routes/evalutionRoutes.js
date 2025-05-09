import express from "express";
import mongoose from "mongoose";
import EvaluationModel from "../model/evalutionModel.js";
import NotificationModel from "../model/notificationModel.js";
import videoWorkModel from "../model/videoWork.model.js";
import practiceWorkModel from "../model/practiceWork.model.js";
import materialModel from "../model/material.model.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import teacherModel from "../model/teacher.model.js";

const router = express.Router();

// Submit evaluation
router.post("/submit", authMiddleware, async (req, res) => {
  const { userId } = req.userData;
  const { workId, workType, fileUrl, rating, comment, studentId } = req.body;

  if (!workId || !workType || !fileUrl || !rating || !studentId) {
    return res
      .status(400)
      .json({ status: "error", message: "Ma'lumotlar to‘liq emas" });
  }

  // Verify the user is a teacher
  const teacher = await teacherModel.findById(userId);
  if (!teacher) {
    return res
      .status(403)
      .json({ status: "error", message: "Faqat o‘qituvchilar baholay oladi" });
  }

  try {
    // Find the student associated with the work

    if (workType === "videoWork") {
      const work = await videoWorkModel.findById(workId);
      if (!work) throw new Error("Ish topilmadi");
    } else if (workType === "practiceWork") {
      const work = await practiceWorkModel.findById(workId);
      if (!work) throw new Error("Ish topilmadi");
    } else if (workType === "material") {
      const material = await materialModel.findById(workId);
      if (!material) throw new Error("Material topilmadi");
      // Materials are uploaded by teachers, so no studentId here
      return res
        .status(400)
        .json({ status: "error", message: "Materiallar baholanmaydi" });
    }

    const evaluation = new EvaluationModel({
      workId,
      workType,
      fileUrl,
      rating,
      comment: comment || "",
    });

    await evaluation.save();

    // Send notification to student
    const title =
      workType === "videoWork"
        ? "Video vazifa baholandi"
        : "Amaliyot baholandi";
    const notification = new NotificationModel({
      recipientType: "student",
      recipientId: studentId,
      workId: workId,
      type: "evaluation",
      title,
      message: `Sizning "${fileUrl
        .split("/")
        .pop()}" faylingiz ${rating} yulduz bilan baholandi.`,
      relatedId: evaluation._id,
      relatedType: "evaluation",
      rating,
    });
    await notification.save();

    res.status(200).json({ status: "success", data: evaluation });
  } catch (err) {
    console.log(err);

    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;

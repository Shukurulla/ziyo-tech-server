import express from "express";
import mongoose from "mongoose";
import NotificationModel from "../model/notificationModel.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import studentModel from "../model/student.model.js";
import teacherModel from "../model/teacher.model.js";
import videoWorkModel from "../model/videoWork.model.js";

const router = express.Router();

// Helper function to determine user type
const getUserType = async (userId) => {
  const student = await studentModel.findById(userId);
  if (student) return "student";
  const teacher = await teacherModel.findById(userId);
  if (teacher) return "teachers";
  throw new Error("Foydalanuvchi topilmadi");
};
router.get("/all", async (req, res) => {
  try {
    const all = await NotificationModel.find();
    const videoWorks = await videoWorkModel.find();
    for (let i = 0; i < all.length; i++) {
      await NotificationModel.findByIdAndDelete(all[i]._id);
    }
    for (let i = 0; i < videoWorks.length; i++) {
      await videoWorkModel.findByIdAndDelete(videoWorks[i]._id);
    }
    res.json({ data: all });
  } catch (error) {}
});

// Fetch notifications for a user (sorted by latest and unread)
router.get("/", authMiddleware, async (req, res) => {
  const { userId } = req.userData;

  try {
    const userType = await getUserType(userId);
    let notifications;
    if (userType === "teachers") {
      notifications = await NotificationModel.find({
        recipientType: "teachers",
      }).sort({ read: 1, createdAt: -1 }); // Unread first, then latest
    } else {
      notifications = await NotificationModel.find({
        recipientType: "student",
        recipientId: userId,
      }).sort({ read: 1, createdAt: -1 });
    }
    res.status(200).json({ status: "success", data: notifications });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});
// Fetch unread notification count
router.get("/unread-count", authMiddleware, async (req, res) => {
  const { userId } = req.userData;

  try {
    const userType = await getUserType(userId);
    let unreadCount;
    if (userType === "teachers") {
      unreadCount = await NotificationModel.countDocuments({
        recipientType: "teachers",
        read: false,
      });
    } else {
      unreadCount = await NotificationModel.countDocuments({
        recipientType: "student",
        recipientId: userId,
        read: false,
      });
    }
    res.status(200).json({ status: "success", data: unreadCount });
  } catch (err) {
    console.error("Unread count error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});
// Mark notification as read
router.patch("/read/:id", authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const notification = await NotificationModel.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    );
    if (!notification) {
      return res
        .status(404)
        .json({ status: "error", message: "Xabarnoma topilmadi" });
    }
    res.status(200).json({ status: "success", data: notification });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});
// Other routes remain unchanged
export default router;

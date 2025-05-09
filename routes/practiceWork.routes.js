import express from "express";
import multer from "multer";
import Client from "ssh2-sftp-client";
import practiceWorkModel from "../model/practiceWork.model.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import studentModel from "../model/student.model.js";
import TeacherModel from "../model/teacher.model.js"; // Assume this exists
import NotificationModel from "../model/notificationModel.js"; // Assume this exists
import practiceModel from "../model/practiceModel.js";

const router = express.Router();

// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// SFTP configuration
const sftpConfig = {
  host: "45.134.39.117",
  port: 22,
  username: "root",
  password: "CH7aQhydDipRB9b1Jjrv", // Replace with secure credentials
};

// Upload file route
router.post(
  "/upload",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const { userId } = req.userData;
      const { practiceId } = req.body;
      const file = req.file;

      if (!file || !practiceId) {
        return res.status(400).json({
          status: "error",
          message: "Fayl yoki practiceId yetishmayapti",
        });
      }
      const practice = await practiceModel.findById(practiceId);
      if (!practice) {
        return res.status(403).json({
          status: "error",
          message: "Bunday praktika malumotlari topilmadi",
        });
      }
      const student = await studentModel.findById(userId);
      if (!student) {
        return res.status(403).json({
          status: "error",
          message: "Faqat talabalar fayl yuklashi mumkin",
        });
      }

      const sftp = new Client();
      await sftp.connect(sftpConfig);

      const basePath = "/media/practice";
      try {
        await sftp.mkdir(basePath, true); // Create directory if it doesn't exist
      } catch (err) {
        if (err.message.indexOf("File exists") === -1) throw err;
      }

      const remotePath = `${basePath}/${Date.now()}_${file.originalname}`;
      await sftp.put(Buffer.from(file.buffer), remotePath);
      await sftp.end();

      const fileUrl = `http://kepket.uz${remotePath}`;

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
          title: `Yangi amaliyot: Practice ID ${practiceId}`,
          message: `Talaba ${student._id} practice ID ${practiceId} uchun "${file.originalname}" faylini yubordi.`,
          relatedId: newWork._id,
          relatedType: "practiceWork",
          recipientType: "student",
          practiceTitle: newWork.practiceTitle,
        });
        await notification.save();
      }

      res.json({
        status: "success",
        data: newWork,
      });
    } catch (err) {
      console.error("Fayl yuklashda xatolik:", err);
      res.status(500).json({
        status: "error",
        message: "Server xatosi: " + err.message,
      });
    }
  }
);

export default router;

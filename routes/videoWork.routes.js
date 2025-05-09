import express from "express";
import multer from "multer";
import Client from "ssh2-sftp-client";
import videoWorkModel from "../model/videoWork.model.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import studentModel from "../model/student.model.js";
import TeacherModel from "../model/teacher.model.js"; // Assume this exists
import NotificationModel from "../model/notificationModel.js"; // Assume this exists

const router = express.Router();

// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage }).array("files"); // Allow multiple files

// SFTP configuration
const sftpConfig = {
  host: "45.134.39.117",
  port: 22,
  username: "root",
  password: "CH7aQhydDipRB9b1Jjrv", // Replace with secure credentials
};

router.post("/", upload, authMiddleware, async (req, res) => {
  try {
    const { userId } = req.userData;
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({ error: "Ma'lumotlar to‘liq emas." });
    }

    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Fayllar topilmadi." });
    }

    const findStudent = await studentModel.findById(userId);
    if (!findStudent) {
      return res
        .status(400)
        .json({ status: "error", message: "Bunday student topilmadi" });
    }

    const sftp = new Client();
    await sftp.connect(sftpConfig);

    const basePath = "/media/files";
    try {
      await sftp.mkdir(basePath, true); // Create directory if it doesn't exist
    } catch (err) {
      if (err.message.indexOf("File exists") === -1) throw err;
    }

    const works = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const remotePath = `${basePath}/${Date.now()}_${file.originalname}`;
      await sftp.put(Buffer.from(file.buffer), remotePath);

      const fileNameWithoutExt = file.originalname
        .split(".")
        .slice(0, -1)
        .join(".");
      works.push({
        title: fileNameWithoutExt,
        fileUrl: `http://kepket.uz${remotePath}`,
      });
    }
    await sftp.end();

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
        title: `Yangi video vazifasi: Video ID ${videoId}`,
        message: `Talaba ${findStudent._id} video ID ${videoId} uchun ${files.length} ta fayl yubordi.`,
        relatedId: newRecord._id,
        relatedType: "videoWork",
        workId: videoId,
        recipientType: "student",
      });
      await notification.save();
    }

    res.json({ data: newRecord, status: "success" });
  } catch (err) {
    console.error("Xatolik:", err);
    res.status(500).json({ error: "Yuklashda xatolik yuz berdi." });
  }
});

router.get("/:videoId", async (req, res) => {
  try {
    const works = await videoWorkModel.findOne({ videoId: req.params.videoId });
    if (!works) {
      return res.status(400).json({
        status: "error",
        message: "Bu videoga tegishli vazifalar topilmadi",
      });
    }
    res.json({ status: "success", data: works });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

export default router;

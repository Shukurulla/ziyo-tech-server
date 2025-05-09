import express from "express";
import multer from "multer";
import Client from "ssh2-sftp-client";
import videoModel from "../model/video.model.js";
import { getAccessToken } from "../utils/apiVideoAuth.js"; // token olish uchun

const router = express.Router();

// Multer'ni fayllarni xotiraga olish uchun memoryStorage foydalanamiz
const storage = multer.memoryStorage(); // memoryStorage() orqali faylni xotiraga olish
const upload = multer({ storage });

const sftpConfig = {
  host: "45.134.39.117",
  port: 22,
  username: "root",
  password: "CH7aQhydDipRB9b1Jjrv",
};

router.post(
  "/",
  upload.fields([
    // Video, Audio va Presentation fayllarini olish
    { name: "audios", maxCount: 5 },
    { name: "presentations", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const { title, description, video } = req.body;

      // SFTP orqali fayllarni yuborish uchun ulanish
      const sftp = new Client();
      await sftp.connect(sftpConfig);

      // Audio va prezentatsiyalarni uzatish
      const audios = {};
      const presentations = {};

      // Audio fayllarini uzatish
      for (const file of req.files.audios || []) {
        const remotePath = `/media/files/${file.originalname}`;
        await sftp.put(Buffer.from(file.buffer), remotePath); // faylni xotiradan yuborish
        audios[file.originalname] = `http://kepket.uz${remotePath}`;
      }

      // Prezentatsiyalarni uzatish
      for (const file of req.files.presentations || []) {
        const remotePath = `/media/files/${file.originalname}`;
        await sftp.put(Buffer.from(file.buffer), remotePath); // faylni xotiradan yuborish
        presentations[file.originalname] = `http://kepket.uz${remotePath}`;
      }

      await sftp.end();

      // MongoDB ga saqlash
      const saved = await videoModel.create({
        video: JSON.parse(video), // video ma'lumotlarini JSON sifatida saqlash
        title,
        description,
        presentations,
        audios,
      });

      // Javob qaytarish
      res.json(saved);
    } catch (err) {
      console.error("Uploadda xatolik:", err.response?.data || err.message);
      res.status(500).json({ error: "Upload muvaffaqiyatsiz tugadi." });
    }
  }
);

export default router;

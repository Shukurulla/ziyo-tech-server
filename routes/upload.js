import express from "express";
import multer from "multer";
import Client from "ssh2-sftp-client";
import videoModel from "../model/video.model.js";
import { getAccessToken } from "../utils/apiVideoAuth.js"; // token olish uchun

const router = express.Router();

const storage = multer.memoryStorage();
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
    { name: "audios", maxCount: 5 },
    { name: "presentations", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const { title, description, video } = req.body;

      const timestamp = Date.now(); // hozirgi vaqtni olish

      const sftp = new Client();
      await sftp.connect(sftpConfig);

      const audios = {};
      const presentations = {};

      // Audio fayllar
      for (const file of req.files.audios || []) {
        const uniqueName = `${timestamp}-${file.originalname}`;
        const remotePath = `/media/files/${uniqueName}`;
        await sftp.put(Buffer.from(file.buffer), remotePath);
        audios[file.originalname] = `http://kepket.uz${remotePath}`;
      }

      // Prezentatsiyalar fayllari
      for (const file of req.files.presentations || []) {
        const uniqueName = `${timestamp}-${file.originalname}`;
        const remotePath = `/media/files/${uniqueName}`;
        await sftp.put(Buffer.from(file.buffer), remotePath);
        presentations[file.originalname] = `http://kepket.uz${remotePath}`;
      }

      await sftp.end();

      const saved = await videoModel.create({
        video: JSON.parse(video),
        title,
        description,
        presentations,
        audios,
      });

      res.json(saved);
    } catch (err) {
      console.error("Uploadda xatolik:", err.response?.data || err.message);
      res.status(500).json({ error: "Upload muvaffaqiyatsiz tugadi." });
    }
  }
);

export default router;

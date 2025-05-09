import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import Client from "ssh2-sftp-client";
import path from "path";
import MaterialModel from "../model/material.model.js"; // Adjust path as needed
import authMiddleware from "../middlewares/auth.middleware.js";

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

// Get all materials
router.get("/materials", authMiddleware, async (req, res) => {
  try {
    const materials = await MaterialModel.find();
    res.json({ status: "success", data: materials });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Get material by ID
router.get("/materials/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const material = await MaterialModel.findById(id);
    if (!material) {
      return res
        .status(404)
        .json({ status: "error", message: "Material topilmadi" });
    }
    res.json({ status: "success", data: material });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Upload or create material
router.post(
  "/materials",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const { title, description, content } = req.body;
      const file = req.file;

      if (!title || !description || !content) {
        return res.status(400).json({
          status: "error",
          message: "Title, description va content majburiy",
        });
      }

      let fileUrl = "";
      let fileType = "";
      if (content === "file") {
        if (!file) {
          return res.status(400).json({
            status: "error",
            message: "File content uchun fayl majburiy",
          });
        }
        const sftp = new Client();
        await sftp.connect(sftpConfig);
        const remotePath = `/media/materials/${Date.now()}_${
          file.originalname
        }`;
        await sftp.put(Buffer.from(file.buffer), remotePath);
        await sftp.end();
        fileUrl = `http://kepket.uz${remotePath}`;
        fileType = path
          .extname(file.originalname)
          .toLowerCase()
          .replace(".", ""); // e.g., "pdf", "docx"
      } else if (content === "link") {
        fileUrl = req.body.fileUrl || "";
        fileType = "link";
        if (!fileUrl) {
          return res.status(400).json({
            status: "error",
            message: "Link content uchun fileUrl majburiy",
          });
        }
      }

      const newMaterial = new MaterialModel({
        title,
        description,
        fileUrl,
        fileType,
        content,
      });

      await newMaterial.save();
      res.json({ status: "success", data: newMaterial });
    } catch (err) {
      console.error("Material yuklashda xatolik:", err);
      res.status(500).json({ status: "error", message: err.message });
    }
  }
);

// Delete material
router.delete("/materials/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const material = await MaterialModel.findById(id);
    if (!material) {
      return res
        .status(404)
        .json({ status: "error", message: "Material topilmadi" });
    }

    if (material.content === "file") {
      const sftp = new Client();
      await sftp.connect(sftpConfig);
      await sftp.delete(material.fileUrl.replace("http://kepket.uz", ""));
      await sftp.end();
    }

    await MaterialModel.findByIdAndDelete(id);
    res.json({ status: "success", message: "Material o‘chirildi" });
  } catch (err) {
    console.error("Material o‘chirishda xatolik:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;

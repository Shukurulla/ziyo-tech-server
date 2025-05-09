import express from "express";
import multer from "multer";
import Practice from "../model/practiceModel.js";
import { uploadFileSFTP, deleteFileSFTP } from "../utils/sftpClient.js";
import path from "path";
import authMiddleware from "../middlewares/auth.middleware.js";
import studentModel from "../model/student.model.js";
import teacherModel from "../model/teacher.model.js";
import practiceWorkModel from "../model/practiceWork.model.js";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { title, description } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "Fayl yuborilmadi" });
    }

    // ⬇️ Faqat timestamp bilan nomlash (masalan: 1746701989234.docx)
    const ext = path.extname(file.originalname); // .docx
    const fileName = `${Date.now()}${ext}`;

    const remotePath = `/media/files/${fileName}`;
    const fileUrl = `https://kepket.uz/media/files/${fileName}`;

    await uploadFileSFTP(file.buffer, remotePath);

    const newPractice = await Practice.create({
      title,
      description,
      fileUrl,
    });

    res.status(201).json(newPractice);
  } catch (err) {
    console.error("SFTP upload xatosi:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ O‘qish
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.userData;

    // Student yoki Teacher borligini tekshirish
    const student = await studentModel.findById(userId);
    const teacher = !student ? await teacherModel.findById(userId) : null;

    if (!student && !teacher) {
      return res
        .status(401)
        .json({ status: "error", message: "Autentifikatsiya amalga oshmagan" });
    }

    const practices = await Practice.find().sort({ createdAt: -1 });

    // Agar foydalanuvchi student bo‘lsa, har bir practice uchun completed ni tekshir
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

      return res.json({ data: enrichedPractices });
    }

    // Agar teacher bo‘lsa
    res.json({ data: practices });
  } catch (err) {
    console.error("Xatolik:", err);
    res.status(500).json({ status: "error", message: "Server xatosi" });
  }
});

router.get("/:workId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.userData;
    const { workId } = req.params;

    const student = await studentModel.findById(userId);
    const teacher = !student ? await teacherModel.findById(userId) : null;

    if (!student && !teacher) {
      return res
        .status(401)
        .json({ status: "error", message: "Autentifikatsiya amalga oshmagan" });
    }

    const practice = await Practice.findById(workId);
    if (!practice) {
      return res
        .status(404)
        .json({ status: "error", message: "Practice topilmadi" });
    }

    if (student) {
      const work = await practiceWorkModel.findOne({
        student: student._id,
        practice: practice._id,
      });

      return res.json({
        data: {
          ...practice.toObject(),
          completed: !!work,
          ...(work ? { work: work.toObject() } : {}),
        },
      });
    }

    // Teacher bo‘lsa
    res.json({ data: practice });
  } catch (err) {
    console.error("Xatolik:", err);
    res.status(500).json({ status: "error", message: "Server xatosi" });
  }
});

// ✅ O‘chirish
router.delete("/:id", async (req, res) => {
  const practice = await Practice.findById(req.params.id);
  if (!practice)
    return res
      .status(404)
      .json({ status: "error", message: "Bunday file topilmadi" });

  const fileName = practice.fileUrl.split("/").pop();
  const remotePath = `/media/files/${fileName}`;

  await Practice.findByIdAndDelete(practice._id);
  await deleteFileSFTP(remotePath);

  res.json({ message: "O‘chirildi" });
});

export default router;

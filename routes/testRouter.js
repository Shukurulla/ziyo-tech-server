import express from "express";
import TestModel from "../model/testModel.js";
import testModel from "../model/testModel.js";
import studentModel from "../model/student.model.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();
router.get("/all", async (req, res) => {
  try {
    const allTests = await testModel.find();

    res.json({ data: allTests });
  } catch (error) {}
});

router.post("/:videoId", async (req, res) => {
  try {
    const { topic, questions } = req.body;
    const { videoId } = req.params;

    if (!topic || !questions || questions.length === 0) {
      return res.status(400).json({ message: "Mavzu va savollar kerak" });
    }

    const newTest = await TestModel.create({
      video: videoId,
      topic,
      questions,
    });

    res.status(201).json(newTest);
  } catch (err) {
    console.error("Test saqlashda xatolik:", err.message);
    res.status(500).json({ message: "Server xatosi" });
  }
});

// routes/testRouter.js
router.get("/:videoId", async (req, res) => {
  try {
    const tests = await testModel.findOne({ video: req.params.videoId });
    if (!tests) {
      return res.json({
        status: "error",
        message: "Bu videoning test malumotlari topilmadi",
      });
    }
    res.status(200).json({ data: tests });
  } catch (err) {
    res.status(500).json({ message: "Testlarni olishda xatolik" });
  }
});

// routes/testRouter.js
router.delete("/:videoId", async (req, res) => {
  try {
    const findTest = await TestModel.findById(req.params.videoId);
    if (!findTest) {
      return res
        .status(400)
        .json({ status: "error", message: "Bunday test topilmadi" });
    }
    await TestModel.findByIdAndDelete(req.params.videoId);

    res
      .status(200)
      .json({ status: "success", message: "Test muaffaqiyatli o'chirildi" });
  } catch (err) {
    res.status(500).json({ message: "Testlarni olishda xatolik" });
  }
});
router.post("/:videoId/submit", authMiddleware, async (req, res) => {
  const { videoId } = req.params;
  const { answers, score } = req.body;
  const { userId } = req.userData;

  try {
    const student = await studentModel.findById(userId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Agar completeLessons ichida bo‘lsa, yangilash
    const existing = student.complateLessons.find((l) => l.videoId === videoId);
    if (existing) {
      existing.score = score;
      existing.answers = answers;
    } else {
      student.complateLessons.push({ videoId, score, answers });
    }

    await student.save();
    res.json({ message: "Test submitted successfully" });
  } catch (err) {
    console.error("Submit error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;

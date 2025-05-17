// routes/question.js
import express from "express";
import Question from "../models/question.js";

const router = express.Router();

// Yangi savol qo'shish
router.post("/create", async (req, res) => {
  try {
    const question = new Question(req.body);
    await question.save();
    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Foydalanuvchi javobini tekshirish
router.post("/submit", async (req, res) => {
  try {
    const { questionId, selectedPairs } = req.body; // selectedPairs: [{ option1: "car", option2: "BMW" }, ...]
    const question = await Question.findById(questionId);

    if (!question) {
      return res.status(404).json({ error: "Savol topilmadi" });
    }

    let correctCount = 0;
    const results = selectedPairs.map((pair) => {
      const option1 = question.options.find((opt) => opt.text === pair.option1);
      if (!option1) return { pair, isCorrect: false };

      const isCorrect = option1.match === pair.option2;
      if (isCorrect) correctCount++;
      return { pair, isCorrect };
    });

    res.json({
      results,
      score: correctCount,
      total: selectedPairs.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Barcha savollarni olish
router.get("/", async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

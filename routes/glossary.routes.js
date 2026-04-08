import express from "express";
import GlossaryModel from "../model/glossary.model.js";
import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

// Get all glossary entries
router.get("/glossary", async (req, res) => {
  try {
    const glossary = await GlossaryModel.find().sort({ createdAt: -1 });
    res.json({ status: "success", data: glossary });
  } catch (err) {
    console.error("Error fetching glossary:", err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Get glossary entry by ID
router.get("/glossary/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await GlossaryModel.findById(id);
    if (!entry) {
      return res.status(404).json({
        status: "error",
        message: "Glossary entry not found",
      });
    }
    res.json({ status: "success", data: entry });
  } catch (err) {
    console.error("Error fetching glossary entry:", err);
    res.status(500).json({ status: "error", message: "Server error" });
  }
});

// Create new glossary entry
router.post("/glossary", authMiddleware, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        status: "error",
        message: "Title and content are required",
      });
    }

    const newEntry = new GlossaryModel({
      title,
      content,
    });

    await newEntry.save();
    res.json({
      status: "success",
      data: newEntry,
      message: "Glossary entry created successfully",
    });
  } catch (err) {
    console.error("Glossary creation error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error: " + err.message,
    });
  }
});

// Update glossary entry
router.put("/glossary/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const entry = await GlossaryModel.findById(id);
    if (!entry) {
      return res.status(404).json({
        status: "error",
        message: "Glossary entry not found",
      });
    }

    if (!title || !content) {
      return res.status(400).json({
        status: "error",
        message: "Title and content are required",
      });
    }

    const updatedEntry = await GlossaryModel.findByIdAndUpdate(
      id,
      { title, content },
      { new: true }
    );

    res.json({
      status: "success",
      message: "Glossary entry updated successfully",
      data: updatedEntry,
    });
  } catch (err) {
    console.error("Glossary update error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error: " + err.message,
    });
  }
});

// Delete glossary entry
router.delete("/glossary/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await GlossaryModel.findById(id);

    if (!entry) {
      return res.status(404).json({
        status: "error",
        message: "Glossary entry not found",
      });
    }

    await GlossaryModel.findByIdAndDelete(id);

    res.json({
      status: "success",
      message: "Glossary entry deleted successfully",
    });
  } catch (err) {
    console.error("Glossary deletion error:", err);
    res.status(500).json({
      status: "error",
      message: "Server error: " + err.message,
    });
  }
});

export default router;

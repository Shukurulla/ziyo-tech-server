// models/question.js - updated with videoId field
import mongoose from "mongoose";

const optionSchema = new mongoose.Schema({
  text: String, // Variant matni, masalan, "car" yoki "BMW"
  group: Number, // 1 yoki 2 (birinchi yoki ikkinchi guruh)
  match: String, // To'g'ri juftlik, masalan, "car" uchun "BMW"
});

const questionSchema = new mongoose.Schema({
  questionText: String, // Savol matni
  options: [optionSchema], // 10 ta variant
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Video",
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Question", questionSchema);

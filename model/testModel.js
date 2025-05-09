import mongoose from "mongoose";

const testSchema = new mongoose.Schema({
  video: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Video",
    required: true,
  },
  topic: {
    type: String,
    required: true,
  },
  questions: [
    {
      question: { type: String, required: true },
      options: {
        a: { type: String, required: true },
        b: { type: String, required: true },
        c: { type: String, required: true },
        d: { type: String, required: true },
      },
      correctAnswer: {
        type: String,
        enum: ["a", "b", "c", "d"],
        required: true,
      },
    },
  ],
});

export default mongoose.model("Test", testSchema);

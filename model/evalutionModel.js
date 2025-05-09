import mongoose from "mongoose";

const evaluationSchema = new mongoose.Schema(
  {
    workId: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    workType: {
      type: String,
      enum: ["videoWork", "practiceWork", "material"],
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

const EvaluationModel = mongoose.model("evaluation", evaluationSchema);

export default EvaluationModel;

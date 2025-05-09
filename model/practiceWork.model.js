import mongoose from "mongoose";

const practiceWorkSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    practice: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    practiceTitle: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const practiceWorkModel = mongoose.model("practiceWork", practiceWorkSchema);

export default practiceWorkModel;

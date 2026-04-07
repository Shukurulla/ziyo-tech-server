import mongoose from "mongoose";

const videoWorkSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    videoId: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    works: [
      {
        title: {
          type: String,
          required: true,
        },
        fileUrl: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const videoWorkModel = mongoose.model("videoWorks", videoWorkSchema);

export default  videoWorkModel;

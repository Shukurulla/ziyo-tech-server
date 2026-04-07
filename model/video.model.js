import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    video: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    presentations: {
      type: Object,
      default: {},
    },
    audios: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const videoModel = mongoose.model("video", videoSchema);

export default videoModel;

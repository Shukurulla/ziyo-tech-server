import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
  {
    video: {
      iframe: { type: String, required: true },
      player: { type: String, required: true },
      hls: { type: String, required: true },
      thumbnail: { type: String, required: true },
      mp4: { type: String, required: true },
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
      required: true,
    },
    audios: {
      type: Object,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const videoModel = mongoose.model("video", videoSchema);

export default videoModel;

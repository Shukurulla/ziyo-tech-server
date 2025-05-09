import mongoose from "mongoose";

const materialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      enum: ["file", "link"],
    },
  },
  {
    timestamps: true,
  }
);

const MaterialModel = mongoose.model("material", materialSchema);

export default MaterialModel;

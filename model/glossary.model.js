import mongoose from "mongoose";

const glossarySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const GlossaryModel = mongoose.model("glossary", glossarySchema);

export default GlossaryModel;

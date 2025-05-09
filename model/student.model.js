import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true,
    },
    lastname: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      required: true,
    },
    school: {
      type: String,
      required: true,
    },
    login: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    complateLessons: [
      {
        videoId: {
          type: mongoose.Types.ObjectId,
          required: true,
        },
        score: {
          type: String,
          required: true,
        },
        answers: {
          type: Object,
          require: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const studentModel = mongoose.model("student", studentSchema);

export default studentModel;

import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientType: {
      type: String,
      enum: ["teachers", "student"],
      required: true,
    },
    recipientId: {
      type: mongoose.Types.ObjectId,
      required: function () {
        return this.recipientType === "student";
      },
    },
    type: {
      type: String,
      enum: ["submission", "evaluation"],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedId: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    relatedType: {
      type: String,
      enum: ["videoWork", "practiceWork", "material", "evaluation"],
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    workId: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    rating: {
      type: Number,
    },
  },
  {
    timestamps: true,
  }
);

const NotificationModel = mongoose.model("notification", notificationSchema);

export default NotificationModel;

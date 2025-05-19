// Updated routes/video.routes.js
import express from "express";
import videoModel from "../model/video.model.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import Client from "ssh2-sftp-client";

const router = express.Router();

// SFTP configuration
const sftpConfig = {
  host: "45.134.39.117",
  port: 22,
  username: "root",
  password: "CH7aQhydDipRB9b1Jjrv",
};

router.get("/all", async (req, res) => {
  try {
    const allVideos = await videoModel.find();
    res.json({ status: "success", data: allVideos });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const findVideo = await videoModel.findById(req.params.id);
    if (!findVideo)
      return res
        .status(400)
        .json({ status: "error", message: "Bunday video topilmadi" });
    res.json({ status: "success", data: findVideo });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Update video information
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const { title, description } = req.body;
    const videoId = req.params.id;

    const updateVideo = await videoModel.findByIdAndUpdate(
      videoId,
      {
        title,
        description,
      },
      { new: true }
    );

    if (!updateVideo) {
      return res.status(404).json({
        status: "error",
        message: "Video topilmadi",
      });
    }

    res.json({
      status: "success",
      message: "Video muvaffaqiyatli yangilandi",
      data: updateVideo,
    });
  } catch (error) {
    console.error("Video update error:", error);
    res.status(500).json({
      status: "error",
      message: "Serverda xatolik yuz berdi",
    });
  }
});

// Delete video
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const videoId = req.params.id;

    // Find the video first to get file URLs
    const video = await videoModel.findById(videoId);
    if (!video) {
      return res.status(404).json({
        status: "error",
        message: "Video topilmadi",
      });
    }

    // Delete the video from the database
    await videoModel.findByIdAndDelete(videoId);

    // Delete associated files from SFTP server
    const sftp = new Client();
    await sftp.connect(sftpConfig);

    try {
      // Delete presentation files
      for (const [_, url] of Object.entries(video.presentations)) {
        if (url.startsWith("http://kepket.uz")) {
          const remotePath = url.replace("http://kepket.uz", "");
          try {
            await sftp.delete(remotePath);
          } catch (err) {
            console.warn(
              `Could not delete presentation file: ${remotePath}`,
              err.message
            );
          }
        }
      }

      // Delete audio files
      for (const [_, url] of Object.entries(video.audios)) {
        if (url.startsWith("http://kepket.uz")) {
          const remotePath = url.replace("http://kepket.uz", "");
          try {
            await sftp.delete(remotePath);
          } catch (err) {
            console.warn(
              `Could not delete audio file: ${remotePath}`,
              err.message
            );
          }
        }
      }
    } finally {
      await sftp.end();
    }

    res.json({
      status: "success",
      message: "Video va tegishli fayllar muvaffaqiyatli o'chirildi",
    });
  } catch (error) {
    console.error("Video delete error:", error);
    res.status(500).json({
      status: "error",
      message: "Serverda xatolik yuz berdi",
    });
  }
});

export default router;

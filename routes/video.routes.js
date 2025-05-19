// Enhanced video.routes.js
import express from "express";
import videoModel from "../model/video.model.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import Client from "ssh2-sftp-client";
import multer from "multer";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

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

// Update video files (add new files)
router.post(
  "/update-files",
  authMiddleware,
  upload.fields([
    { name: "audios", maxCount: 5 },
    { name: "presentations", maxCount: 5 },
  ]),
  async (req, res) => {
    try {
      const { videoId, title, description } = req.body;

      // Find the existing video
      const existingVideo = await videoModel.findById(videoId);
      if (!existingVideo) {
        return res.status(404).json({
          status: "error",
          message: "Video topilmadi",
        });
      }

      const timestamp = Date.now();
      const sftp = new Client();
      await sftp.connect(sftpConfig);

      // Process new audio files
      const newAudios = {};
      if (req.files.audios && req.files.audios.length > 0) {
        for (const file of req.files.audios) {
          const uniqueName = `${timestamp}-${file.originalname}`;
          const remotePath = `/media/files/${uniqueName}`;
          await sftp.put(Buffer.from(file.buffer), remotePath);
          newAudios[file.originalname] = `http://kepket.uz${remotePath}`;
        }
      }

      // Process new presentation files
      const newPresentations = {};
      if (req.files.presentations && req.files.presentations.length > 0) {
        for (const file of req.files.presentations) {
          const uniqueName = `${timestamp}-${file.originalname}`;
          const remotePath = `/media/files/${uniqueName}`;
          await sftp.put(Buffer.from(file.buffer), remotePath);
          newPresentations[file.originalname] = `http://kepket.uz${remotePath}`;
        }
      }

      await sftp.end();

      // Merge with existing files
      const updatedAudios = {
        ...existingVideo.audios,
        ...newAudios,
      };

      const updatedPresentations = {
        ...existingVideo.presentations,
        ...newPresentations,
      };

      // Update in database
      const updatedVideo = await videoModel.findByIdAndUpdate(
        videoId,
        {
          title,
          description,
          audios: updatedAudios,
          presentations: updatedPresentations,
        },
        { new: true }
      );

      res.json({
        status: "success",
        message: "Video fayllar muvaffaqiyatli yangilandi",
        data: updatedVideo,
      });
    } catch (error) {
      console.error("Video files update error:", error);
      res.status(500).json({
        status: "error",
        message: "Serverda xatolik yuz berdi: " + error.message,
      });
    }
  }
);

// Delete specific files from video
router.post("/delete-file", authMiddleware, async (req, res) => {
  try {
    const { videoId, fileType, fileName } = req.body;

    // Find the existing video
    const video = await videoModel.findById(videoId);
    if (!video) {
      return res.status(404).json({
        status: "error",
        message: "Video topilmadi",
      });
    }

    // Delete the file from SFTP server
    const fileUrl = video[fileType][fileName];
    if (fileUrl && fileUrl.startsWith("http://kepket.uz")) {
      const remotePath = fileUrl.replace("http://kepket.uz", "");

      const sftp = new Client();
      await sftp.connect(sftpConfig);

      try {
        await sftp.delete(remotePath);
      } catch (err) {
        console.warn(`Could not delete file: ${remotePath}`, err.message);
      }

      await sftp.end();
    }

    // Remove from database
    const updatedFiles = { ...video[fileType] };
    delete updatedFiles[fileName];

    const updateData = {};
    updateData[fileType] = updatedFiles;

    const updatedVideo = await videoModel.findByIdAndUpdate(
      videoId,
      { $set: updateData },
      { new: true }
    );

    res.json({
      status: "success",
      message: "Fayl muvaffaqiyatli o'chirildi",
      data: updatedVideo,
    });
  } catch (error) {
    console.error("File delete error:", error);
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

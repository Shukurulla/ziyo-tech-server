// routes/video.routes.js - Fixed version with correct URL generation
import express from "express";
import videoModel from "../model/video.model.js";
import authMiddleware from "../middlewares/auth.middleware.js";
import { materialUpload, multerErrorHandler } from "../utils/multerConfig.js";
import fs from "fs";
import path from "path";

const router = express.Router();

// Helper function to get correct domain based on request
const getDomainFromRequest = (req) => {
  const host = req.get("host");
  if (host.includes("teacher.")) {
    return "https://teacher.ziyo-tech.uz";
  }
  return "https://ziyo-tech.uz";
};

// Get all videos
router.get("/all", async (req, res) => {
  try {
    const allVideos = await videoModel.find();
    res.json({ status: "success", data: allVideos });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Get video by ID
router.get("/:id", async (req, res) => {
  try {
    const findVideo = await videoModel.findById(req.params.id);
    if (!findVideo) {
      return res.status(404).json({
        status: "error",
        message: "Video not found",
      });
    }
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
      { title, description },
      { new: true }
    );

    if (!updateVideo) {
      return res.status(404).json({
        status: "error",
        message: "Video not found",
      });
    }

    res.json({
      status: "success",
      message: "Video updated successfully",
      data: updateVideo,
    });
  } catch (error) {
    console.error("Video update error:", error);
    res.status(500).json({
      status: "error",
      message: "Server error: " + error.message,
    });
  }
});

// Update video files (add new files)
router.post(
  "/update-files",
  authMiddleware,
  materialUpload,
  multerErrorHandler,
  async (req, res) => {
    try {
      const { videoId, title, description } = req.body;
      const files = req.files;

      // Find the existing video
      const existingVideo = await videoModel.findById(videoId);
      if (!existingVideo) {
        // Clean up uploaded files
        if (files) {
          Object.values(files)
            .flat()
            .forEach((file) => {
              fs.unlink(file.path, (err) => {
                if (err) console.error("Error deleting file:", err);
              });
            });
        }

        return res.status(404).json({
          status: "error",
          message: "Video not found",
        });
      }

      // Get the correct domain for file URLs
      const domain = getDomainFromRequest(req);

      // Process new audio files
      const newAudios = {};
      if (files && files.audios && files.audios.length > 0) {
        files.audios.forEach((file) => {
          const fileUrl = `${domain}/uploads/audios/${file.filename}`;
          newAudios[file.originalname] = fileUrl;
        });
      }

      // Process new presentation files
      const newPresentations = {};
      if (files && files.presentations && files.presentations.length > 0) {
        files.presentations.forEach((file) => {
          const fileUrl = `${domain}/uploads/presentations/${file.filename}`;
          newPresentations[file.originalname] = fileUrl;
        });
      }

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
        message: "Video files updated successfully",
        data: updatedVideo,
      });
    } catch (error) {
      // Clean up uploaded files in case of error
      if (req.files) {
        Object.values(req.files)
          .flat()
          .forEach((file) => {
            fs.unlink(file.path, (err) => {
              if (err) console.error("Error deleting file:", err);
            });
          });
      }

      console.error("Video files update error:", error);
      res.status(500).json({
        status: "error",
        message: "Server error: " + error.message,
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
        message: "Video not found",
      });
    }

    // Delete the file from local storage
    const fileUrl = video[fileType][fileName];
    if (fileUrl && fileUrl.includes("ziyo-tech.uz")) {
      const filename = path.basename(fileUrl);
      const filePath = path.join("uploads", fileType, filename);
      fs.unlink(filePath, (err) => {
        if (err)
          console.warn(`Could not delete file: ${filePath}`, err.message);
      });
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
      message: "File deleted successfully",
      data: updatedVideo,
    });
  } catch (error) {
    console.error("File delete error:", error);
    res.status(500).json({
      status: "error",
      message: "Server error: " + error.message,
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
        message: "Video not found",
      });
    }

    // Delete the video from the database
    await videoModel.findByIdAndDelete(videoId);

    // Delete associated files from local storage
    try {
      // Delete presentation files
      for (const [_, url] of Object.entries(video.presentations)) {
        if (url.includes("ziyo-tech.uz")) {
          const filename = path.basename(url);
          const filePath = path.join("uploads/presentations", filename);
          fs.unlink(filePath, (err) => {
            if (err)
              console.warn(
                `Could not delete presentation file: ${filePath}`,
                err.message
              );
          });
        }
      }

      // Delete audio files
      for (const [_, url] of Object.entries(video.audios)) {
        if (url.includes("ziyo-tech.uz")) {
          const filename = path.basename(url);
          const filePath = path.join("uploads/audios", filename);
          fs.unlink(filePath, (err) => {
            if (err)
              console.warn(
                `Could not delete audio file: ${filePath}`,
                err.message
              );
          });
        }
      }
    } catch (deleteError) {
      console.warn("Error deleting some files:", deleteError.message);
    }

    res.json({
      status: "success",
      message: "Video and associated files deleted successfully",
    });
  } catch (error) {
    console.error("Video delete error:", error);
    res.status(500).json({
      status: "error",
      message: "Server error: " + error.message,
    });
  }
});

export default router;

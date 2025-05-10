import express from "express";
import videoModel from "../model/video.model.js";

const router = express.Router();

router.get("/all", async (req, res) => {
  try {
    const allVideos = await videoModel.find();
    for (let i = 0; i < allVideos.length; i++) {
      await videoModel.findByIdAndDelete(allVideos[i]._id);
    }
    res.json({ status: "success", data: allVideos });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const findVideo = await videoModel.findById(req.params.id);
    if (!findVideo)
      res
        .status(400)
        .json({ status: "error", message: "Bunday video topilmadi" });
    res.json({ status: "success", data: findVideo });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

export default router;

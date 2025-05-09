import express from "express";
import studentModel from "../model/student.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import authMiddleware from "../middlewares/auth.middleware.js";
import videoModel from "../model/video.model.js";
const router = express.Router();

router.post("/sign", async (req, res) => {
  try {
    const { login, password } = req.body;
    const findStudent = await studentModel.findOne({ login });
    if (findStudent) {
      return res.status(400).json({
        status: "error",
        message: "Bunday student oldin ro'yhatdan otgan",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newStudent = await studentModel.create({
      ...req.body,
      password: hashedPassword,
    });
    const token = jwt.sign({ userId: newStudent._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
    res.json({
      status: "success",
      data: newStudent,
      token,
      message: "Student muaffaqiyatli yaratildi",
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { login, password } = req.body;
    const findStudent = await studentModel.findOne({ login });
    if (!findStudent)
      res.status(400).json({
        status: "error",
        message: "Bunday login foydalanuvchisi topilmadi",
      });
    const comparePassword = await bcrypt.compare(
      password,
      findStudent.password
    );
    if (!comparePassword)
      res
        .status(400)
        .json({ status: "error", message: "Password mos kelmadi" });
    const token = jwt.sign(
      { userId: findStudent._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );
    res.json({ status: "success", data: findStudent, token });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.userData;
    const findStudent = await studentModel.findById(userId);
    if (!findStudent)
      res
        .status(400)
        .json({ status: "error", message: "Bunday student topilmadi" });
    res.json({ status: "success", data: findStudent });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});
router.put("/editProfile/:id", async (req, res) => {
  const { id } = req.params;
  const { firstname, lastname, level, school, login, password } = req.body;

  try {
    // Studentni ID orqali topamiz va yangilaymiz
    const student = await studentModel.findById(id);

    if (!student) {
      return res.status(404).json({ message: "Student topilmadi" });
    }

    // Ma'lumotlarni yangilash
    student.firstname = firstname || student.firstname;
    student.lastname = lastname || student.lastname;
    student.level = level || student.level;
    student.school = school || student.school;
    student.login = login || student.login;
    student.password = password || student.password;

    // Yangilangan studentni saqlaymiz
    const updatedStudent = await student.save();

    res.status(200).json(updatedStudent);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Xatolik yuz berdi" });
  }
});

router.get("/videos/all", authMiddleware, async (req, res) => {
  try {
    const allVideos = await videoModel.find();
    const student = await studentModel.findById(req.userData.userId);

    if (!student) {
      return res
        .status(404)
        .json({ status: "error", message: "Talaba topilmadi" });
    }

    const completedIds = student.complateLessons.map((lesson) =>
      lesson.videoId.toString()
    );

    let watchingSet = false;

    const videosWithStatus = allVideos.map((video) => {
      const videoIdStr = video._id.toString();

      if (completedIds.includes(videoIdStr)) {
        return {
          ...video.toObject(),
          complete: true,
        };
      } else if (!watchingSet) {
        watchingSet = true;
        return {
          ...video.toObject(),
          complete: "watching",
        };
      } else {
        return {
          ...video.toObject(),
          complete: false,
        };
      }
    });

    res.json({ status: "success", data: videosWithStatus });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Server xatosi: " + error.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    const students = await studentModel.find();
    res.json({ data: students });
  } catch (error) {}
});

export default router;

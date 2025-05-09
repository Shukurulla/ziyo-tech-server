import express from "express";
import teacherModel from "../model/teacher.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import authMiddleware from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/sign", async (req, res) => {
  try {
    const { login, password } = req.body;
    const findteacher = await teacherModel.findOne({ login });
    if (findteacher) {
      return res.status(400).json({
        status: "error",
        message: "Bunday teacher oldin ro'yhatdan otgan",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newteacher = await teacherModel.create({
      ...req.body,
      password: hashedPassword,
    });
    const token = jwt.sign({ userId: newteacher._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
    res.json({
      status: "success",
      data: newteacher,
      token,
      message: "teacher muaffaqiyatli yaratildi",
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { login, password } = req.body;
    const findteacher = await teacherModel.findOne({ login });
    if (!findteacher)
      res.status(400).json({
        status: "error",
        message: "Bunday login foydalanuvchisi topilmadi",
      });
    const comparePassword = await bcrypt.compare(
      password,
      findteacher.password
    );
    if (!comparePassword)
      res
        .status(400)
        .json({ status: "error", message: "Password mos kelmadi" });
    const token = jwt.sign(
      { userId: findteacher._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "30d",
      }
    );
    res.json({ status: "success", data: findteacher, token });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.userData;
    const findteacher = await teacherModel.findById(userId);
    if (!findteacher)
      res
        .status(400)
        .json({ status: "error", message: "Bunday teacher topilmadi" });
    res.json({ status: "success", data: findteacher });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});
router.put("/:id", async (req, res) => {
  try {
    const { firstname, lastname, workPlace, position, login, password } =
      req.body;

    const updatedTeacher = await teacherModel.findByIdAndUpdate(
      req.params.id,
      { firstname, lastname, workPlace, position, login, password },
      { new: true }
    );

    if (!updatedTeacher) {
      return res.status(404).json({ error: "O'qituvchi topilmadi" });
    }

    res.json(updatedTeacher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET one teacher
router.get("/:id", async (req, res) => {
  try {
    const teacher = await teacherModel.findById(req.params.id);
    if (!teacher)
      return res.status(404).json({ error: "O'qituvchi topilmadi" });
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

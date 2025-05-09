// routes/token.js
import express from "express";
import { getAccessToken } from "../utils/apiVideoAuth.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const token = await getAccessToken();
    res.json({ accessToken: token });
  } catch (err) {
    res.status(500).json({ error: "Token olishda xatolik" });
  }
});

export default router;

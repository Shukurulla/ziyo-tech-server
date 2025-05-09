// utils/apiVideoAuth.js
import axios from "axios";

export const getAccessToken = async () => {
  try {
    const res = await axios.post("https://ws.api.video/auth/api-key", {
      apiKey: process.env.API_VIDEO_KEY,
    });

    return res.data.access_token;
  } catch (error) {
    console.error(
      "Access token olishda xatolik:",
      error.response?.data || error.message
    );
    throw new Error("Access token olishda xatolik");
  }
};

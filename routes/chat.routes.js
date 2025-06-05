// New file: routes/chat.routes.js
import express from "express";
import mongoose from "mongoose";
import authMiddleware from "../middlewares/auth.middleware.js";
import axios from "axios";

const router = express.Router();

// Create the chat message model schema
const chatMessageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    isUser: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);

// Get user's chat history
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.userData;
    const messages = await ChatMessage.find({ userId })
      .sort({ createdAt: 1 })
      .limit(100);

    // Format messages for client
    const formattedMessages = messages.map((msg) => ({
      text: msg.text,
      isUser: msg.isUser,
    }));

    res.json({ status: "success", data: formattedMessages });
  } catch (error) {
    console.error("Chat history error:", error);
    res.status(500).json({
      status: "error",
      message: "Chat tarixini yuklashda xatolik",
    });
  }
});

// Save a new message
router.post("/message", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.userData;
    const { text, isUser } = req.body;

    if (!text) {
      return res.status(400).json({
        status: "error",
        message: "Xabar matni kerak",
      });
    }

    const newMessage = await ChatMessage.create({
      userId,
      text,
      isUser,
    });

    res.json({ status: "success", data: newMessage });
  } catch (error) {
    console.error("Save message error:", error);
    res.status(500).json({
      status: "error",
      message: "Xabarni saqlashda xatolik",
    });
  }
});

// Get AI response
router.post("/ai-response", authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        status: "error",
        message: "Xabar matni kerak",
      });
    }

    // Call to OpenAI API (or your preferred AI service)
    const aiResponse = await generateAIResponse(message);

    res.json({ status: "success", response: aiResponse });
  } catch (error) {
    console.error("AI response error:", error);
    res.status(500).json({
      status: "error",
      message: "AI javobini olishda xatolik",
    });
  }
});

// Function to interact with OpenAI API
async function generateAIResponse(userMessage) {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4.1-nano",
        messages: [
          {
            role: "system",
            content:
              "Iltimos, faqat o'zbek tilida javob ber. Hech qachon boshqa tillardan foydalanma.",
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization:
            "Bearer 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",
        },
      }
    );

    return (
      response.data?.choices?.[0]?.message?.content || "Uzr, javob topilmadi."
    );
  } catch (error) {
    console.error("OpenAI API error:", error);
    return "AI xizmatida xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.";
  }
}

export default router;

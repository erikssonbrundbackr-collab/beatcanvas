// server/aiCoachRoute.js
import { Router } from "express";
import { askDrumCoach } from "./aiEngine.js";

const router = Router();

// Frontend skickar POST till /api/ai-coach
router.post("/", async (req, res) => {
  try {
    const question = req.body?.message || "";

    if (!question.trim()) {
      return res.status(400).json({ error: "Ingen fråga skickades." });
    }

    const reply = await askDrumCoach(question);
    return res.json({ reply });
  } catch (err) {
    console.error("❌ Fel i /api/ai-coach:", err);
    return res.status(500).json({
      error: "AI-motorn fick ett fel.",
      details: err?.message || "Okänt fel",
    });
  }
});

export default router;

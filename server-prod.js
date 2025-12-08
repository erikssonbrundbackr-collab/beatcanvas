// server-prod.js – PROD server (frontend + AI på samma port)
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import bodyParser from "body-parser";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// ---- AI-ROUTE ----
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/ai/coach", async (req, res) => {
  try {
    const question = req.body.question || "";
    console.log("AI-coach fråga (prod):", question);

    const completion = await client.responses.create({
      model: "gpt-5.1-mini",
      input: `
Du är en vänlig trumlärare. Svara kort och konkret.
Fråga från elev: "${question}"
`,
    });

    const answer =
      completion.output?.[0]?.content?.[0]?.text ||
      "Jag kunde tyvärr inte generera ett svar just nu.";

    res.json({ answer });
  } catch (err) {
    console.error("Prod AI-server fel:", err);
    res.status(500).json({ error: "Internt serverfel i AI-servern (prod)." });
  }
});

// ---- STATIC FRONTEND ----
const distPath = path.join(__dirname, "dist");
app.use(express.static(distPath));

app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Prod-servern körs på port ${PORT}`);
});

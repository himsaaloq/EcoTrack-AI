
require("dotenv").config({
  path: require("path").join(__dirname, ".env")
});

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

// CORS is needed for local frontend development.
// In production, frontend and backend use the same Vercel domain.
if (process.env.NODE_ENV !== "production") {
  const allowedOrigins = (
    process.env.FRONTEND_ORIGIN ||
    "http://localhost:5500,http://127.0.0.1:5500"
  )
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Origin not allowed by EcoTrack API CORS policy.")
      );
    }
  }));
}

app.use(express.json({ limit: "32kb" }));

app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please wait a minute and try again."
  }
}));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "EcoTrack AI API"
  });
});

// AI Chat API
app.post("/api/chat", async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({
        error: "AI server is not configured."
      });
    }

    const { messages, context } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: "Please send a chat message."
      });
    }

    const safeMessages = messages
      .slice(-13)
      .map((message) => {
        if (
          !message ||
          !["user", "assistant"].includes(message.role) ||
          typeof message.content !== "string"
        ) {
          return null;
        }

        return {
          role: message.role,
          content: message.content.slice(0, 2000)
        };
      })
      .filter(Boolean);

    if (
      !safeMessages.length ||
      safeMessages[safeMessages.length - 1].role !== "user"
    ) {
      return res.status(400).json({
        error: "The latest message must be from the user."
      });
    }

    const footprint =
      context?.footprintResult &&
      typeof context.footprintResult === "object"
        ? context.footprintResult
        : null;

    const inputs =
      context?.calculatorInputs &&
      typeof context.calculatorInputs === "object"
        ? context.calculatorInputs
        : null;

    const ecoContext = {
      latestEstimatedDailyFootprintKgCO2: footprint?.total ?? null,
      estimatedBreakdown: footprint?.breakdown ?? null,
      calculatorInputs: inputs
    };

    const systemPrompt = `You are EcoTrack AI, a helpful, friendly sustainability assistant inside a student-focused carbon-footprint tracker.

Answer the user's actual question directly. Avoid repeating the same generic tips; use the conversation history and vary examples. Keep most replies concise (3-6 sentences), practical, encouraging, and easy to understand.

Use kg CO2e where relevant and explain that figures are estimates, not exact measurements. Prefer India-relevant examples when useful, but do not invent official statistics or claim certainty.

If the user's question is unrelated to sustainability, answer briefly and politely steer back when appropriate.

The app may provide the user's calculator data below. Use it only as user-provided app estimates; do not treat it as independently verified. If no footprint is available, say so rather than inventing one. Never claim you changed the user's data or performed an action in the app.

Current EcoTrack user context (JSON): ${JSON.stringify(ecoContext)}`;

    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...safeMessages
        ],
        temperature: 0.85,
        top_p: 0.9,
        max_tokens: 500
      }),
      signal: AbortSignal.timeout(30000)
    });

    const result = await groqResponse.json().catch(() => ({}));

    if (!groqResponse.ok) {
      const status = groqResponse.status;

      console.error(
        "Groq API error:",
        status,
        result?.error?.message || "Unknown provider error"
      );

      if (status === 401 || status === 403) {
        return res.status(502).json({
          error: "The AI server key was rejected. Check the GROQ_API_KEY in backend environment variables."
        });
      }

      if (status === 429) {
        return res.status(503).json({
          error: "The AI service is busy or its rate limit was reached. Please try again shortly."
        });
      }

      return res.status(502).json({
        error: "The AI provider could not complete the request. Please try again shortly."
      });
    }

    const reply = result?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return res.status(502).json({
        error: "The AI provider returned an empty reply."
      });
    }

    return res.json({ reply });

  } catch (error) {
    console.error("/api/chat error:", error.message);

    if (
      error.name === "TimeoutError" ||
      error.name === "AbortError"
    ) {
      return res.status(504).json({
        error: "The AI request timed out. Please try again."
      });
    }

    return res.status(500).json({
      error: "Something went wrong on the AI server. Please try again."
    });
  }
});

// Error handler
app.use((error, _req, res, _next) => {
  if (error.message && error.message.includes("CORS")) {
    return res.status(403).json({
      error: "This website is not allowed to access the EcoTrack API. Check FRONTEND_ORIGIN."
    });
  }

  console.error("Server error:", error.message);

  return res.status(500).json({
    error: "Internal server error."
  });
});

// Local development server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`EcoTrack AI backend running on port ${PORT}`);
  });
}

// Export Express app for Vercel
module.exports = app;

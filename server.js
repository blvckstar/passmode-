const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const SYSTEM = `You are PASSMODE Coach, a sharp, encouraging, academically honest tutor for South African university and college students. Help students learn rather than merely copy. Use clear language, structured steps, relevant South African examples where appropriate, and explain jargon. Never claim to know a lecturer's exact exam or predict official exam questions. If course-specific facts may vary, tell the student to verify with their prescribed notes. For study planning, be realistic: include breaks, sleep, classes, and active recall. Do not shame students. Keep responses useful and organised.`;

async function askModel(instructions, input) {
  if (!API_KEY) {
    const err = new Error("The server has no OPENAI_API_KEY configured. Add it to your .env file and restart the server.");
    err.status = 503;
    throw err;
  }
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      instructions: `${SYSTEM}\n\n${instructions}`,
      input,
      max_output_tokens: 5000
    })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `AI provider returned status ${response.status}`;
    const err = new Error(message);
    err.status = response.status === 401 ? 502 : response.status;
    throw err;
  }
  const text = payload.output?.flatMap(item => item.content || [])
    .filter(part => part.type === "output_text")
    .map(part => part.text).join("\n") || "";
  return text;
}

function extractJSON(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("The AI returned an unexpected format. Please try again.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

app.post("/api/study", async (req, res) => {
  try {
    const { action, mode, message, history, module, topic, difficulty, type, count, extra, modules, hours, window } = req.body || {};
    let instructions = "";
    let input = "";

    if (action === "chat") {
      const modeInstructions = {
        "Explain simply": "Prioritise plain-language explanations, examples, and a short recap.",
        "Socratic tutor": "Guide the learner through questions. Ask one useful question at a time when appropriate; don't immediately give away every answer.",
        "Exam marker": "Help the learner practise exam responses. Explain what earns marks and give constructive feedback. Do not claim to know the official marking rubric unless provided.",
        "Memory coach": "Use active recall, spaced repetition, mnemonics, and retrieval practice."
      };
      instructions = `Teaching mode: ${mode || "Explain simply"}. ${modeInstructions[mode] || ""}`;
      const previous = Array.isArray(history) ? history.slice(-10).map(m => `${m.role === "assistant" ? "Coach" : "Student"}: ${String(m.content || "").slice(0, 5000)}`).join("\n\n") : "";
      input = `${previous ? `Recent conversation:\n${previous}\n\n` : ""}Student's latest message:\n${String(message || "").slice(0, 12000)}`;
    } else if (action === "quiz") {
      instructions = `Create a useful practice set for a South African college/university student. Return ONLY valid JSON with this exact shape: {"title":"...","questions":[{"type":"Multiple choice or Short answer or Calculation or Case study","question":"...","options":["A...","B...","C...","D..."],"correctIndex":0,"answer":"...","explanation":"..."}]}. For multiple choice include exactly four options and correctIndex as zero-based integer. For non-MCQ, options may be an empty array and answer should include a model answer or worked solution. Make questions original and aligned to the stated topic; do not claim they are official past-paper questions or guaranteed exam predictions. Explanations should teach the underlying idea. Requested count: ${Math.max(3, Math.min(15, Number(count) || 8))}.`;
      input = `Module: ${String(module || "").slice(0,150)}\nTopic: ${String(topic || "").slice(0,300)}\nDifficulty: ${difficulty || "Mixed"}\nQuestion type: ${type || "Mixed questions"}\nExtra instructions: ${String(extra || "None").slice(0,1000)}\nGenerate the requested questions now.`;
      const text = await askModel(instructions, input);
      const parsed = extractJSON(text);
      if (!Array.isArray(parsed.questions)) throw new Error("The AI didn't return a question list. Please try again.");
      return res.json({ title: parsed.title || `${module}: ${topic}`, questions: parsed.questions });
    } else if (action === "plan") {
      instructions = `Build a realistic short revision timetable for the next 7 days, returned ONLY as valid JSON with shape {"title":"...","days":[{"day":"Monday, 19 October","focus":"...","sessions":[{"time":"18:00–18:35","module":"...","task":"specific study activity","duration":"35 min","reason":"why this gets priority"}]}]}. Include only 1 to 4 focused sessions per day depending on available hours. Include short breaks by leaving gaps or mentioning breaks in a session. Use active recall and practice questions, not just rereading. Prioritise near exams, low confidence, and high priority modules. Avoid scheduling all available hours; protect sleep and leave buffer time. Use dates starting today where possible. Preferred study window: ${window || "Flexible"}. Total available study hours per day: ${Math.max(1,Math.min(12,Number(hours)||3))}.`;
      input = `Today's date is ${new Date().toISOString().slice(0,10)}. Student modules:\n${JSON.stringify(modules || [], null, 2)}\nCreate a realistic 7-day plan using these modules. If an exam date has passed, do not schedule revision for that exam unless useful for catch-up.`;
      const text = await askModel(instructions, input);
      return res.json(extractJSON(text));
    } else {
      return res.status(400).json({ error: "Unknown study action." });
    }

    const text = await askModel(instructions, input);
    return res.json({ text });
  } catch (error) {
    console.error("PASSMODE AI error:", error.message);
    res.status(error.status || 500).json({
      error: error.status === 503 ? error.message : (error.message || "Something went wrong. Please try again.")
    });
  }
});

app.get("/api/health", (_req, res) => res.json({ ok: true, aiConfigured: Boolean(API_KEY), model: MODEL }));
app.listen(PORT, () => console.log(`PASSMODE AI running at http://localhost:${PORT}`));

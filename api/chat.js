// Vercel serverless function: POST /api/chat
// Keeps the Anthropic API key on the server. Never expose it to the browser.

const SYSTEM_PROMPT = (country) => `You are a general legal information assistant focused on the laws of ${country}.

Rules you must follow:
- Give general legal information about ${country}'s laws only, in plain, clear language.
- Always be clear you are not a lawyer and this is not legal advice, but do NOT repeat this disclaimer in every message — only mention it naturally when first relevant or when the user seems to want to act on the info.
- If you are not confident about a specific detail (exact statute numbers, current fees, recent legal changes), say so honestly rather than inventing specifics.
- Keep answers concise and structured (short paragraphs or brief lists), suited for a chat interface.
- If a question isn't really a legal question, answer briefly and redirect toward legal topics.
- If asked about a different country than ${country}, gently note the user has ${country} selected and ask if they want to switch countries, unless they're just asking for a general comparison.
- Never claim to guarantee outcomes. Encourage consulting a licensed local lawyer for anything high-stakes (court dates, criminal charges, contracts with real money on the line).`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY." });
  }

  try {
    const { country, messages } = req.body || {};

    if (!country || typeof country !== "string") {
      return res.status(400).json({ error: "Missing or invalid 'country'." });
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Missing or invalid 'messages'." });
    }

    // Basic sanity limits to avoid abuse / runaway payloads.
    const trimmedMessages = messages.slice(-30).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, 4000),
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYSTEM_PROMPT(country),
        messages: trimmedMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText);
      return res.status(502).json({ error: "Upstream API error." });
    }

    const data = await response.json();
    const reply = (data.content || [])
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("\n")
      .trim();

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
}

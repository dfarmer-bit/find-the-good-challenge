/// <reference lib="deno.ns" />

import OpenAI from "https://esm.sh/openai@4.28.0";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  try {
    const { answers } = await req.json();

    const prompt = `
You are helping a person create a clear, warm, thorough Personal Mission Statement.

RULES:
- Output ONLY the mission statement text (no headings, no bullets, no labels).
- 320–420 words.
- Tone: calm, grounded, non-judgmental, encouraging.
- Use first person ("I").
- Avoid clichés and generic corporate language.
- Make it feel specific to the user's answers.
- Write as a narrative (paragraphs allowed, but no lists).

USER ANSWERS (JSON):
${JSON.stringify(answers, null, 2)}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.55,
    });

    const mission_text = (completion.choices?.[0]?.message?.content ?? "").trim();

    return new Response(JSON.stringify({ mission_text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

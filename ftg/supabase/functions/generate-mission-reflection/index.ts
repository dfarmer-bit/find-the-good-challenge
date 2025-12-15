/// <reference lib="deno.ns" />

import OpenAI from "https://esm.sh/openai@4.28.0";

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  try {
    const { mission_text, answers } = await req.json();

    const prompt = `
Write a calm, non-judgmental reflection (120–160 words) based ONLY on the user's mission and answers.

Mission:
${mission_text}

Answers:
${JSON.stringify(answers, null, 2)}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    return new Response(
      JSON.stringify({
        reflection_text: completion.choices[0].message.content,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500 }
    );
  }
});

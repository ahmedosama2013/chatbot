// netlify/functions/chat.js
//
// This serverless function acts as a secure proxy between the browser and the
// Groq API (console.groq.com). The API key never reaches the client — it
// lives only here, as a Netlify environment variable.
//
// >>> INSERT YOUR API KEY IN THE NETLIFY DASHBOARD, NOT IN THIS FILE <<<
// Site settings → Environment variables → Add variable
//   Key:   GROQ_API_KEY
//   Value: your-groq-api-key (from https://console.groq.com/keys)
//
// (Locally with `netlify dev`, put the same line in a .env file instead:
//   GROQ_API_KEY=your-groq-api-key
// )

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b"; // Updated to replace deprecated llama-3.3-70b-versatile

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed. Use POST." }),
    };
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          "Server is missing GROQ_API_KEY. Add it in Netlify → Site settings → Environment variables, then redeploy.",
      }),
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON in request body." }),
    };
  }

  const { messages } = payload;

  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Request must include a non-empty 'messages' array." }),
    };
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.7,
        stream: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: data?.error?.message || "The Groq API returned an error.",
        }),
      };
    }

    const reply = data?.choices?.[0]?.message?.content ?? "";

    return {
      statusCode: 200,
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to reach the Groq API. " + err.message }),
    };
  }
};
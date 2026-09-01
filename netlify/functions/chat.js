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

const MAX_HISTORY_MESSAGES = 12;

function friendlyErrorFor(status) {
  if (status === 429 || status === 413) {
    return "You've hit the message limit for now, try again in a few seconds.";
  }
  if (status >= 500) {
    return "The AI service is temporarily unavailable. Please try again shortly.";
  }
  return "Something went wrong processing that message. Please try again.";
}

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

  // Keep only the most recent messages so token usage stays bounded, no matter
  // how long the conversation has gotten on the client.
  const trimmedMessages =
    messages.length > MAX_HISTORY_MESSAGES
      ? messages.slice(messages.length - MAX_HISTORY_MESSAGES)
      : messages;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: trimmedMessages,
        temperature: 0.7,
        stream: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Never forward Groq's raw error text to the client — always translate
      // it into one of a few short, user-facing messages.
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: friendlyErrorFor(response.status) }),
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
      body: JSON.stringify({ error: "Couldn't reach the AI service. Please try again." }),
    };
  }
};

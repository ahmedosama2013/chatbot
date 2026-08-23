# 💬 Chatbot

**Chatbot** is a clean, dark theme AI chat web application powered by the Groq API under the hood.

## ✨ Features

* **Fast Responses:** Powered by Groq's LPU inference, one of the quickest ways to run open LLMs like Llama today.
* **Multi-Chat History:** Start new conversations anytime, switch between them, and pick up right where you left off.
* **Custom Delete Confirmation:** A themed confirmation dialog for deleting chats — no jarring native browser popups.
* **Code-Aware Formatting:** Inline code and fenced code blocks render cleanly with monospace styling.
* **Privacy First:** All conversation history is saved directly in your browser's local storage — nothing leaves your device except the messages sent to generate a reply.
* **Fully Responsive:** Works smoothly across desktop, tablet, and mobile with a collapsible sidebar.

---

## ⚙️ Setup

Chatbot runs on a Netlify serverless function that keeps your Groq API key private.

1. Deploy this repo on [Netlify](https://netlify.com) (publish directory `.`, no build command needed — already set in `netlify.toml`).
2. In your Netlify site: **Site configuration → Environment variables → Add a variable**
   - Key: `GROQ_API_KEY`
   - Value: your key from [console.groq.com/keys](https://console.groq.com/keys)
3. Redeploy the site so the function picks up the key.

Full details, local testing instructions, and how to change the model are in the comments at the top of `netlify/functions/chat.js`.

---

Made By : ahmedosama2013b@gmail.com

Link : https://github.com/ahmedosama2013/chatbot

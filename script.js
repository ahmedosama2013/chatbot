// ============================================================
// Chatbot — client logic
// Talks to /.netlify/functions/chat, which proxies the Groq API.
// ============================================================

const CHAT_ENDPOINT = "/.netlify/functions/chat";
const STORAGE_KEY = "chatbot.conversations.v1";

/* ---------------------------- DOM refs ---------------------------- */

const chatArea = document.getElementById("chatArea");
const messagesEl = document.getElementById("messages");
const welcomeEl = document.getElementById("welcome");
const composerForm = document.getElementById("composerForm");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const clearBtn = document.getElementById("clearBtn");
const historyList = document.getElementById("historyList");
const suggestionsEl = document.getElementById("suggestions");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const sidebarScrim = document.getElementById("sidebarScrim");
const topbarTitle = document.getElementById("topbarTitle");

const modalBackdrop = document.getElementById("modalBackdrop");
const modalTitleEl = document.getElementById("modalTitle");
const modalBodyEl = document.getElementById("modalBody");
const modalCancelBtn = document.getElementById("modalCancel");
const modalConfirmBtn = document.getElementById("modalConfirm");

/* ---------------------------- State ---------------------------- */

let conversations = loadConversations();
let activeId = conversations.length ? conversations[0].id : null;
let isStreaming = false;

if (!activeId) {
  activeId = createConversation();
}

renderHistory();
renderActiveConversation();

/* ---------------------------- Storage ---------------------------- */

function loadConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveConversations() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {
    /* storage unavailable — fail silently, chat still works this session */
  }
}

function createConversation() {
  const id = "c_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
  conversations.unshift({ id, title: "New chat", messages: [] });
  saveConversations();
  return id;
}

function getActiveConversation() {
  return conversations.find((c) => c.id === activeId);
}

/* ---------------------------- Custom confirm modal ----------------------------
   Replaces window.confirm() and the browser's native right-click menu with a
   themed, keyboard-accessible dialog. Resolves true on confirm, false otherwise. */

function confirmModal({ title, body, confirmLabel = "Delete" }) {
  return new Promise((resolve) => {
    modalTitleEl.textContent = title;
    modalBodyEl.textContent = body;
    modalConfirmBtn.textContent = confirmLabel;
    modalBackdrop.classList.add("visible");
    modalConfirmBtn.focus();

    function cleanup(result) {
      modalBackdrop.classList.remove("visible");
      modalConfirmBtn.removeEventListener("click", onConfirm);
      modalCancelBtn.removeEventListener("click", onCancel);
      modalBackdrop.removeEventListener("mousedown", onBackdropClick);
      document.removeEventListener("keydown", onKeydown);
      resolve(result);
    }
    function onConfirm() {
      cleanup(true);
    }
    function onCancel() {
      cleanup(false);
    }
    function onBackdropClick(e) {
      if (e.target === modalBackdrop) cleanup(false);
    }
    function onKeydown(e) {
      if (e.key === "Escape") cleanup(false);
      if (e.key === "Enter") cleanup(true);
    }

    modalConfirmBtn.addEventListener("click", onConfirm);
    modalCancelBtn.addEventListener("click", onCancel);
    modalBackdrop.addEventListener("mousedown", onBackdropClick);
    document.addEventListener("keydown", onKeydown);
  });
}

/* ---------------------------- Sidebar / history ---------------------------- */

function renderHistory() {
  historyList.innerHTML = "";
  conversations.forEach((conv) => {
    const row = document.createElement("div");
    row.className = "history-row" + (conv.id === activeId ? " active" : "");

    const btn = document.createElement("button");
    btn.className = "history-item";
    btn.type = "button";
    btn.textContent = conv.title || "New chat";
    btn.addEventListener("click", () => {
      activeId = conv.id;
      renderHistory();
      renderActiveConversation();
      closeSidebarOnMobile();
    });

    const del = document.createElement("button");
    del.className = "history-delete";
    del.type = "button";
    del.setAttribute("aria-label", "Delete chat: " + (conv.title || "New chat"));
    del.title = "Delete chat";
    del.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteConversation(conv.id);
    });

    row.appendChild(btn);
    row.appendChild(del);
    historyList.appendChild(row);
  });
}

function renderActiveConversation() {
  const conv = getActiveConversation();
  messagesEl.innerHTML = "";
  updateTopbarTitle();
  if (!conv || conv.messages.length === 0) {
    welcomeEl.style.display = "flex";
    return;
  }
  welcomeEl.style.display = "none";
  conv.messages.forEach((m) => appendMessageToDOM(m.role, m.content));
  scrollToBottom();
}

function updateTopbarTitle() {
  const conv = getActiveConversation();
  topbarTitle.textContent = conv ? conv.title || "New chat" : "Chatbot";
}

/* ---------------------------- New chat / delete ---------------------------- */

newChatBtn.addEventListener("click", () => {
  activeId = createConversation();
  renderHistory();
  renderActiveConversation();
  userInput.value = "";
  autosizeInput();
  closeSidebarOnMobile();
  userInput.focus();
});

async function deleteConversation(id) {
  const conv = conversations.find((c) => c.id === id);
  if (!conv) return;

  const ok = await confirmModal({
    title: "Delete chat?",
    body: `"${conv.title || "New chat"}" will be permanently removed. This can't be undone.`,
    confirmLabel: "Delete",
  });
  if (!ok) return;

  conversations = conversations.filter((c) => c.id !== id);

  if (activeId === id) {
    activeId = conversations.length ? conversations[0].id : createConversation();
  }

  saveConversations();
  renderHistory();
  renderActiveConversation();
}

clearBtn.addEventListener("click", () => {
  if (!activeId) return;
  deleteConversation(activeId);
});

/* ---------------------------- Mobile sidebar toggle ---------------------------- */

sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  sidebarScrim.classList.toggle("visible");
});

sidebarScrim.addEventListener("click", closeSidebarOnMobile);

function closeSidebarOnMobile() {
  sidebar.classList.remove("open");
  sidebarScrim.classList.remove("visible");
}

/* ---------------------------- Suggestions ---------------------------- */

suggestionsEl.addEventListener("click", (e) => {
  const card = e.target.closest(".suggestion-card");
  if (!card) return;
  userInput.value = card.dataset.prompt || "";
  autosizeInput();
  composerForm.requestSubmit();
});

/* ---------------------------- Composer ---------------------------- */

userInput.addEventListener("input", () => {
  autosizeInput();
  sendBtn.disabled = userInput.value.trim().length === 0 || isStreaming;
});

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!sendBtn.disabled) {
      composerForm.requestSubmit();
    }
  }
});

function autosizeInput() {
  userInput.style.height = "auto";
  userInput.style.height = Math.min(userInput.scrollHeight, 200) + "px";
}

composerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = userInput.value.trim();
  if (!text || isStreaming) return;

  const conv = getActiveConversation();
  welcomeEl.style.display = "none";

  conv.messages.push({ role: "user", content: text });
  if (conv.title === "New chat") {
    conv.title = text.slice(0, 42) + (text.length > 42 ? "…" : "");
    updateTopbarTitle();
  }
  saveConversations();
  renderHistory();

  appendMessageToDOM("user", text);
  userInput.value = "";
  autosizeInput();
  sendBtn.disabled = true;
  scrollToBottom();

  await requestAssistantReply(conv);
});

/* ---------------------------- API call ---------------------------- */

async function requestAssistantReply(conv) {
  isStreaming = true;
  const typingEl = appendTypingIndicator();
  scrollToBottom();

  try {
    const response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: conv.messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    const data = await response.json().catch(() => ({}));
    typingEl.remove();

    if (!response.ok) {
      const errMsg = data?.error || "Something went wrong talking to the Groq API.";
      appendMessageToDOM("assistant", errMsg, true);
      isStreaming = false;
      sendBtn.disabled = userInput.value.trim().length === 0;
      return;
    }

    const reply = data.reply || "(No response received.)";
    conv.messages.push({ role: "assistant", content: reply });
    saveConversations();
    appendMessageToDOM("assistant", reply);
  } catch (err) {
    typingEl.remove();
    appendMessageToDOM(
      "assistant",
      "Couldn't reach the server. Check your connection and try again.",
      true
    );
  } finally {
    isStreaming = false;
    sendBtn.disabled = userInput.value.trim().length === 0;
    scrollToBottom();
  }
}

/* ---------------------------- Rendering helpers ---------------------------- */

function appendTypingIndicator() {
  const wrap = document.createElement("div");
  wrap.className = "msg assistant";
  wrap.innerHTML = `
    <div class="msg-body">
      <div class="typing"><span></span><span></span><span></span></div>
    </div>
  `;
  messagesEl.appendChild(wrap);
  return wrap;
}

function appendMessageToDOM(role, content, isError = false) {
  const wrap = document.createElement("div");
  wrap.className = "msg " + role + (isError ? " error" : "");

  const body = document.createElement("div");
  body.className = "msg-body";

  const contentEl = document.createElement("div");
  contentEl.className = "msg-content";
  contentEl.innerHTML = formatContent(content);

  body.appendChild(contentEl);
  wrap.appendChild(body);
  messagesEl.appendChild(wrap);
  return wrap;
}

/** Escapes HTML, then applies light formatting for code blocks / inline code. */
function formatContent(raw) {
  const escaped = escapeHtml(raw);

  // Fenced code blocks ```...```
  let html = escaped.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  // Inline code `...`
  html = html.replace(/`([^`\n]+)`/g, "<code>$1</code>");

  // Bold **...**
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  // Paragraphs (double newline) — keep single newlines as-is via white-space: pre-wrap
  const paragraphs = html.split(/\n{2,}/).map((p) => `<p>${p}</p>`);
  return paragraphs.join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

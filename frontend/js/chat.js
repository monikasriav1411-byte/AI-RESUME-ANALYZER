// ==========================================================================
// STATE MANAGEMENT
// ==========================================================================
let activeSessionId = null;     // Current mock interview session ID
let activeHistoryId = null;     // Selected database item ID
let isInterviewMode = false;     // True when actively running an interview
let currentQACount = 0;          // QA counter in mock interview
let pendingFile = null;          // PDF file waiting for action selection

// DOM SELECTORS
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const menuToggle = document.getElementById("menuToggle");
const historyList = document.getElementById("historyList");

// Headers
const activeChatTitle = document.getElementById("activeChatTitle");

// Content Screens
const chatWindow = document.getElementById("chatWindow");
const chatFeedInner = document.getElementById("chatFeedInner");
const inputContainer = document.getElementById("inputContainer");

// Chat Form
const chatForm = document.getElementById("chatForm");
const promptInput = document.getElementById("promptInput");
const sendBtn = document.getElementById("sendBtn");

// Actions
const newChatBtn = document.getElementById("newChatBtn");
const mockInterviewBtn = document.getElementById("mockInterviewBtn");
const settingsBtn = document.getElementById("settingsBtn");
const logoutBtn = document.getElementById("logoutBtn");
const profileAvatar = document.getElementById("profileAvatar");
const profileName = document.getElementById("profileName");
const attachmentBtn = document.getElementById("attachmentBtn");
const attachmentInput = document.getElementById("attachmentInput");
const toastContainer = document.getElementById("toastContainer");

// ==========================================================================
// TOAST NOTIFICATIONS
// ==========================================================================
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = "toast";
  if (type === "error") toast.style.borderLeftColor = "#ef4444";
  if (type === "success") toast.style.borderLeftColor = "#10b981";
  
  toast.innerHTML = `
    <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    <span>${message}</span>
  `;
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = "slide-in-toast 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ==========================================================================
// SIDEBAR COLLAPSE & MOBILE CONTROLS
// ==========================================================================
function toggleSidebar() {
  sidebar.classList.toggle("active");
  sidebarOverlay.classList.toggle("active");
}

function closeSidebar() {
  sidebar.classList.remove("active");
  sidebarOverlay.classList.remove("active");
}

if (menuToggle) menuToggle.addEventListener("click", toggleSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);

// ==========================================================================
// HISTORY MANAGER (DATABASE SYNC)
// ==========================================================================
function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true });
}

async function loadHistory(selectFirstId = null) {
  try {
    const res = await fetch("/api/history");
    const data = await res.json();
    
    historyList.innerHTML = "";
    
    if (!data.items || data.items.length === 0) {
      historyList.innerHTML = `
        <div class="history-empty-state">
          No recent sessions.
        </div>`;
      return;
    }

    data.items.forEach(item => {
      const el = document.createElement("div");
      el.className = `history-item ${activeHistoryId === item.id ? "active" : ""}`;
      el.dataset.id = item.id;
      
      const scoreLabel = item.score !== null && item.score !== undefined
        ? `${item.score}/10`
        : "—";

      const iconPath = item.type === "analysis" 
        ? `<svg class="icon-chat" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>`
        : `<svg class="icon-chat" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>`;

      el.innerHTML = `
        ${iconPath}
        <div class="history-item-content">
          <div class="history-item-title">${item.title}</div>
          <div class="history-item-time">${formatDate(item.created_at)}</div>
        </div>
        <div class="history-item-actions">
          <span class="history-badge" style="font-size: 0.72rem; padding: 2px 6px; border: 1px solid var(--border-color); border-radius: 6px;">${scoreLabel}</span>
          <button class="btn-delete-history" title="Delete session" type="button">
            <svg class="icon-trash" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
          </button>
        </div>
      `;
      
      el.addEventListener("click", (e) => {
        // Prevent selection if clicking the delete button or its child components
        if (e.target.closest(".btn-delete-history")) return;
        selectHistoryItem(item);
      });

      const deleteBtn = el.querySelector(".btn-delete-history");
      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this session?")) {
          try {
            const deleteRes = await fetch(`/api/history/${item.type}/${item.id}`, {
              method: "DELETE"
            });
            const deleteData = await deleteRes.json();
            if (deleteData.success) {
              showToast("Session deleted successfully", "success");
              if (activeHistoryId === item.id) {
                startNewSession();
              }
              await loadHistory();
            } else {
              showToast(deleteData.message || "Failed to delete session.", "error");
            }
          } catch (deleteErr) {
            console.error("Error deleting history item:", deleteErr);
            showToast("Failed to delete session.", "error");
          }
        }
      });

      historyList.appendChild(el);
    });

    if (selectFirstId) {
      const matchedItem = data.items.find(i => i.id === selectFirstId);
      if (matchedItem) selectHistoryItem(matchedItem);
    }

  } catch (err) {
    historyList.innerHTML = `<div class="history-empty-state">Error loading history.</div>`;
    console.error("Error fetching history:", err);
  }
}

function selectHistoryItem(item) {
  activeHistoryId = item.id;
  isInterviewMode = false;
  activeSessionId = null;
  pendingFile = null;
  
  // Highlight active sidebar item
  document.querySelectorAll(".history-item").forEach(el => {
    el.classList.toggle("active", parseInt(el.dataset.id) === item.id);
  });

  chatFeedInner.innerHTML = "";

  if (item.type === "analysis") {
    activeChatTitle.textContent = item.title;
    const bubble = appendMessageHTML("ai", item.detail, "Analysis Saved");
    
    // Inject the grade stamp badge dynamically
    if (bubble) {
      injectScoreStamp(bubble, item.detail);
    }
  } else {
    activeChatTitle.textContent = item.title;
    try {
      const qaHistory = JSON.parse(item.detail);
      qaHistory.forEach((qa, idx) => {
        appendMessageHTML("ai", `**Question ${idx + 1}:**\n${qa.question}`, "Mock Interview");
        if (qa.answer) {
          appendMessageHTML("user", qa.answer, "Your Answer");
        }
        if (qa.feedback) {
          appendMessageHTML("ai", qa.feedback, `Score: ${qa.score}/10`);
        }
      });
      
      if (item.score) {
        const summaryCard = document.createElement("div");
        summaryCard.className = "bubble ai";
        summaryCard.style.border = "2px dashed var(--success-color)";
        summaryCard.style.backgroundColor = "rgba(16, 185, 129, 0.02)";
        summaryCard.style.marginTop = "12px";
        summaryCard.innerHTML = `
          <div class="bubble-content">
            <h3>🏁 Mock Interview Complete</h3>
            <p><strong>Total Questions Answered:</strong> ${qaHistory.length}</p>
            <p><strong>Average Evaluation Score:</strong> ${item.score} / 10</p>
          </div>
          <span class="bubble-meta">Final Summary</span>
        `;
        chatFeedInner.appendChild(summaryCard);
      }
    } catch (e) {
      chatFeedInner.innerHTML = `<div class="bubble ai">Error parsing interview record details.</div>`;
      console.error(e);
    }
  }
  
  scrollToBottom();
  closeSidebar();
}

// ==========================================================================
// CHAT LAYOUT FORMATTER (MARKDOWN PARSER INTEGRATION)
// ==========================================================================
function appendMessageHTML(sender, text, labelText = "Just now") {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${sender}`;
  
  const formattedText = formatMessageText(text);

  bubble.innerHTML = `
    <div class="bubble-content">${formattedText}</div>
    <span class="bubble-meta">${labelText}</span>
  `;
  
  chatFeedInner.appendChild(bubble);
  return bubble;
}

function formatMessageText(text) {
  // Use the CDN-provided marked library to parse raw Markdown securely
  if (typeof marked !== "undefined" && typeof marked.parse === "function") {
    let html = marked.parse(text);
    // Wrap every <table> in a horizontally-scrollable .table-wrapper div.
    // This is critical for mobile: the wrapper (not the table) carries
    // overflow-x:auto, so thead and tbody columns stay perfectly aligned.
    html = html.replace(/<table(\b[^>]*)>/gi, '<div class="table-wrapper"><table$1>');
    html = html.replace(/<\/table>/gi, '</table></div>');
    return html;
  }
  
  // Fallback to plain formatting if CDN fails to load
  let escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  escaped = escaped.replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>');
  escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
  return escaped.split("\n").map(l => `<p>${l}</p>`).join("");
}

function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Auto-grow input height
promptInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = (this.scrollHeight) + "px";
});

// ==========================================================================
// NEW CHAT / INITIAL SCREEN RESET
// ==========================================================================
function startNewSession() {
  activeHistoryId = null;
  activeSessionId = null;
  isInterviewMode = false;
  pendingFile = null;
  
  // Clear sidebar highlighting
  document.querySelectorAll(".history-item").forEach(el => el.classList.remove("active"));
  
  chatFeedInner.innerHTML = `
    <div class="bubble ai" style="padding: 24px; text-align: center; max-width: 80%; margin: 40px auto 0; align-self: center;">
      <div class="bubble-content">
        <h2 style="font-family: var(--font-family-title); font-size: 1.5rem; margin-bottom: 8px; color: #ffffff;">Welcome to ResumeDesk</h2>
        <p>Click the <strong>paperclip attachment button</strong> at the bottom left of the input bar to upload your PDF resume, and begin either a resume review or an interactive mock interview practice session.</p>
      </div>
    </div>
  `;
  
  activeChatTitle.textContent = "New Session";
  promptInput.placeholder = "Upload a resume first to start chatting...";
  promptInput.focus();
  
  closeSidebar();
}

newChatBtn.addEventListener("click", () => startNewSession());
mockInterviewBtn.addEventListener("click", () => {
  startNewSession();
  showToast("Click the paperclip button to attach a resume and launch the mock interview.", "info");
});

// ==========================================================================
// FILE ATTACHMENT PIPELINE (SPA FLOW)
// ==========================================================================
attachmentBtn.addEventListener("click", () => {
  attachmentInput.click();
});

attachmentInput.addEventListener("change", function () {
  if (this.files.length > 0) {
    const file = this.files[0];
    if (file.type !== "application/pdf") {
      showToast("Only PDF files are supported!", "error");
      this.value = "";
      return;
    }
    
    pendingFile = file;
    showToast(`Attached: ${file.name}`, "success");
    
    // Clear chat window and append options card
    chatFeedInner.innerHTML = "";
    activeChatTitle.textContent = file.name;
    
    // User file uploaded representation
    appendMessageHTML("user", `📎 Uploaded Resume: **${file.name}** (${(file.size / 1024 / 1024).toFixed(2)} MB)`, "Resume Uploaded");
    
    // AI Choice Prompt
    const bubble = document.createElement("div");
    bubble.className = "bubble ai options-card-row";
    bubble.style.borderLeft = "3px solid var(--accent-color)";
    bubble.style.padding = "18px";
    bubble.style.maxWidth = "80%";
    bubble.innerHTML = `
      <div class="bubble-content" style="margin-bottom: 14px;">
        <p>I have received your resume. How would you like to proceed?</p>
        <div style="font-size: 0.82rem; margin-top: 6px; color: var(--text-sidebar-dim);">You can also paste a job description in the input box below before clicking either action to tailor the feedback.</div>
      </div>
      <div class="welcome-actions" style="margin-top: 0; width: 100%; display: flex; gap: 10px;">
        <button type="button" class="btn-primary" id="btnRunAnalyze" style="margin-top: 0; flex: 1;">Analyze Resume</button>
        <button type="button" class="btn-secondary" id="btnRunInterview" style="margin-top: 0; flex: 1;">Mock Interview</button>
      </div>
    `;
    
    chatFeedInner.appendChild(bubble);
    scrollToBottom();
    
    // Bind buttons inside bubble
    bubble.querySelector("#btnRunAnalyze").addEventListener("click", () => runAnalysis());
    bubble.querySelector("#btnRunInterview").addEventListener("click", () => runInterview());
    
    this.value = ""; // Reset file selector
    promptInput.placeholder = "Paste target job description (optional) here...";
    promptInput.focus();
  }
});

// ==========================================================================
// RESUME ANALYSIS (STREAMING RUNNER)
// ==========================================================================
async function runAnalysis() {
  if (!pendingFile) return;
  
  // Remove option card
  const optRow = chatFeedInner.querySelector(".options-card-row");
  if (optRow) optRow.remove();

  // Load state
  promptInput.disabled = true;
  sendBtn.disabled = true;
  
  const bubble = appendMessageHTML("ai", "", "Generating feedback...");
  const textEl = bubble.querySelector(".bubble-content");

  const formData = new FormData();
  formData.append("file", pendingFile);
  
  // Treat whatever is in promptInput as the optional Job Description
  const jdText = promptInput.value.trim();
  formData.append("job_description", jdText);
  
  promptInput.value = "";
  promptInput.placeholder = "Processing...";

  try {
    const response = await fetch("/api/resume/analyze", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Upload analysis failed.");
    }

    const fullFeedback = await streamIntoElement(response, textEl, (txt) => {
      injectScoreStamp(bubble, txt);
    });

    textEl.innerHTML = formatMessageText(fullFeedback);
    injectScoreStamp(bubble, fullFeedback);
    
    showToast("Analysis Complete! Record saved to history.", "success");
    pendingFile = null;
    
    // Reload sidebar history list and highlight the new item
    await loadHistory();
    
  } catch (err) {
    textEl.innerHTML = `<span style="color: #ef4444;">Error during analysis: ${err.message}</span>`;
    showToast(err.message, "error");
  } finally {
    promptInput.disabled = false;
    sendBtn.disabled = false;
    promptInput.placeholder = "Type a message...";
  }
}

// ==========================================================================
// MOCK INTERVIEW INTERACTIVE PLAYBACK
// ==========================================================================
async function runInterview() {
  if (!pendingFile) return;

  const optRow = chatFeedInner.querySelector(".options-card-row");
  if (optRow) optRow.remove();

  // Load state
  promptInput.disabled = true;
  sendBtn.disabled = true;
  showTypingIndicator();
  
  const formData = new FormData();
  formData.append("file", pendingFile);
  
  const jdText = promptInput.value.trim();
  formData.append("job_description", jdText);
  
  promptInput.value = "";
  promptInput.placeholder = "Initializing Mock Interview...";

  try {
    const res = await fetch("/api/resume/start-interview", {
      method: "POST",
      body: formData
    });

    removeTypingIndicator();

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Could not launch interview.");
    }

    const data = await res.json();
    
    // Active interview states
    activeSessionId = data.session_id;
    isInterviewMode = true;
    currentQACount = 1;
    pendingFile = null;
    
    activeChatTitle.textContent = "Mock Interview";
    promptInput.placeholder = "Type your answer here...";
    
    appendMessageHTML("ai", `**Question 1:**\n${data.question}`, "Mock Interview");
    showToast("Interview Session Started!", "success");

  } catch (err) {
    removeTypingIndicator();
    chatFeedInner.innerHTML = `<div class="bubble ai" style="border-color: #ef4444;"><p style="color: #ef4444;">Failed to start interview: ${err.message}</p></div>`;
    showToast(err.message, "error");
  } finally {
    promptInput.disabled = false;
    sendBtn.disabled = false;
    promptInput.focus();
  }
}

// ==========================================================================
// ACTIVE CHAT FORM SUBMIT (INTERVIEW PROCESSOR)
// ==========================================================================
chatForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  
  const messageText = promptInput.value.trim();
  if (!messageText) return;

  // Append user bubble
  appendMessageHTML("user", messageText, "Your Answer");
  
  promptInput.value = "";
  promptInput.style.height = "auto";
  scrollToBottom();

  if (isInterviewMode && activeSessionId) {
    // Disable inputs
    promptInput.disabled = true;
    sendBtn.disabled = true;
    showTypingIndicator();

    try {
      const response = await fetch("/api/interview/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: activeSessionId, answer: messageText })
      });

      removeTypingIndicator();

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to submit answer.");
      }

      // Add feedback bubble
      const bubble = appendMessageHTML("ai", "", "Evaluating...");
      const textEl = bubble.querySelector(".bubble-content");

      // Stream evaluation results
      const fullFeedback = await streamIntoElement(response, textEl);
      textEl.innerHTML = formatMessageText(fullFeedback);

      // Append controls card
      appendInterviewControls();

    } catch (err) {
      removeTypingIndicator();
      appendMessageHTML("ai", `Error evaluating answer: ${err.message}`, "Error");
      showToast(err.message, "error");
      promptInput.disabled = false;
      sendBtn.disabled = false;
    }
  } else {
    // Generic fallback if not in active interview mode
    showTypingIndicator();
    setTimeout(() => {
      removeTypingIndicator();
      appendMessageHTML("ai", "I'm currently ready. Click the **paperclip icon** at the bottom left to load a new PDF resume, or select a past session from the sidebar history list!", "AI Assistant");
      scrollToBottom();
    }, 1000);
  }
});

// Submit on Enter
promptInput.addEventListener("keydown", function(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event("submit"));
  }
});

// Typing indicator bubbles
function showTypingIndicator() {
  const bubble = document.createElement("div");
  bubble.className = "bubble ai typing-row";
  bubble.innerHTML = `
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  chatFeedInner.appendChild(bubble);
  scrollToBottom();
}

function removeTypingIndicator() {
  const row = chatFeedInner.querySelector(".typing-row");
  if (row) row.remove();
}

// Inline Controls for Mock Interview (Next Question / Conclude)
function appendInterviewControls() {
  const bubble = document.createElement("div");
  bubble.className = "bubble ai controls-row";
  bubble.style.borderLeft = "3px solid var(--accent-color)";
  bubble.style.padding = "16px";
  
  bubble.innerHTML = `
    <div class="bubble-content" style="margin-bottom: 12px;">
      <p>Would you like to move on to the next question or conclude the mock interview to see your final score card?</p>
    </div>
    <div class="welcome-actions" style="margin-top: 0; width: 100%; display: flex; gap: 10px;">
      <button type="button" class="btn-primary" id="btnNextQuestion" style="margin-top: 0; flex: 1;">Next Question</button>
      <button type="button" class="btn-secondary" id="btnFinishSummary" style="margin-top: 0; flex: 1;">Finish Interview</button>
    </div>
  `;
  
  chatFeedInner.appendChild(bubble);
  scrollToBottom();

  bubble.querySelector("#btnNextQuestion").addEventListener("click", async () => {
    bubble.remove();
    showTypingIndicator();
    
    try {
      const response = await fetch("/api/interview/next-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: activeSessionId })
      });
      
      removeTypingIndicator();

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Could not fetch next question.");
      }

      const data = await response.json();
      currentQACount++;
      
      appendMessageHTML("ai", `**Question ${currentQACount}:**\n${data.question}`, "Mock Interview");
      
      // Re-enable input area
      promptInput.disabled = false;
      sendBtn.disabled = false;
      promptInput.placeholder = "Type your answer here...";
      promptInput.focus();

    } catch (err) {
      removeTypingIndicator();
      appendMessageHTML("ai", `Failed to retrieve next question: ${err.message}`, "Error");
      showToast(err.message, "error");
    }
  });

  bubble.querySelector("#btnFinishSummary").addEventListener("click", async () => {
    bubble.remove();
    showTypingIndicator();
    
    try {
      const response = await fetch("/api/interview/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: activeSessionId })
      });
      
      removeTypingIndicator();

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Could not generate summary.");
      }

      const data = await response.json();
      
      isInterviewMode = false;
      activeSessionId = null;
      
      promptInput.placeholder = "Session complete.";
      promptInput.disabled = true;
      sendBtn.disabled = true;

      // Render Final Summary Card
      const summaryCard = document.createElement("div");
      summaryCard.className = "bubble ai";
      summaryCard.style.border = "2px dashed var(--success-color)";
      summaryCard.style.backgroundColor = "rgba(16, 185, 129, 0.05)";
      summaryCard.style.padding = "24px";
      summaryCard.style.maxWidth = "90%";
      summaryCard.innerHTML = `
        <div class="bubble-content">
          <h2 style="font-family: var(--font-family-title); font-size: 1.4rem; color: #ffffff; margin-bottom: 8px;">🏁 Mock Interview Complete</h2>
          <p style="margin-bottom: 8px;">Great job! You have completed the mock interview practice.</p>
          <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 12px 0;">
          <p><strong>Total Questions Answered:</strong> ${data.questions_asked}</p>
          <p><strong>Average Performance Score:</strong> <span style="color: var(--success-color); font-size: 1.1rem; font-weight: 700;">${data.average_score !== null ? data.average_score.toFixed(1) : "—"} / 10</span></p>
        </div>
        <span class="bubble-meta">Summary Generated</span>
      `;
      chatFeedInner.appendChild(summaryCard);
      scrollToBottom();
      showToast("Interview Finished! Score saved to database history.", "success");

      // Reload sidebar history list
      await loadHistory();

    } catch (err) {
      removeTypingIndicator();
      appendMessageHTML("ai", `Failed to complete interview: ${err.message}`, "Error");
      showToast(err.message, "error");
    }
  });
}

// ==========================================================================
// PROFILE AND AUX ACTIONS
// ==========================================================================
settingsBtn.addEventListener("click", () => {
  showToast("Profile Settings dashboard is coming soon!");
});

// ==========================================================================
// USER SESSION & LOGOUT MANAGEMENT
// ==========================================================================
function initUserSession() {
  const sessionStr = localStorage.getItem("user_session");
  if (sessionStr) {
    try {
      const user = JSON.parse(sessionStr);
      if (profileName) profileName.textContent = user.name || "User Account";
      if (profileAvatar) {
        if (user.picture) {
          profileAvatar.innerHTML = `<img src="${user.picture}" alt="${user.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        } else {
          const initials = user.name ? user.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "US";
          profileAvatar.textContent = initials;
        }
      }
    } catch (e) {
      console.error("Error parsing user session:", e);
    }
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("user_session");
      showToast("Signing out...", "info");
      setTimeout(() => {
        window.location.href = "/login";
      }, 800);
    });
  }
}

// ==========================================================================
// SETTINGS MODAL & PREFERENCES CONTROLLER
// ==========================================================================
function initSettingsModal() {
  const settingsModal = document.getElementById("settingsModal");
  const settingsBtn = document.getElementById("settingsBtn");
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  
  const themeSelect = document.getElementById("themeSelect");
  const fontSizeSelect = document.getElementById("fontSizeSelect");
  
  const settingsName = document.getElementById("settingsName");
  const settingsEmail = document.getElementById("settingsEmail");
  const settingsAvatar = document.getElementById("settingsAvatar");
  
  const btnExportHistory = document.getElementById("btnExportHistory");
  const btnDeleteAccount = document.getElementById("btnDeleteAccount");

  // Load Saved Preferences from localStorage on startup
  const savedTheme = localStorage.getItem("pref_theme") || "space-dark";
  const savedFontSize = localStorage.getItem("pref_font_size") || "font-normal";
  
  if (themeSelect) themeSelect.value = savedTheme;
  if (fontSizeSelect) fontSizeSelect.value = savedFontSize;
  
  applyTheme(savedTheme);
  applyFontSize(savedFontSize);

  // Bind Open/Close Events
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      populateProfileDetails();
      if (settingsModal) settingsModal.classList.add("active");
    });
  }

  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener("click", () => {
      if (settingsModal) settingsModal.classList.remove("active");
    });
  }

  window.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      if (settingsModal) settingsModal.classList.remove("active");
    }
  });

  // Bind Preference Changes
  if (themeSelect) {
    themeSelect.addEventListener("change", (e) => {
      const selected = e.target.value;
      localStorage.setItem("pref_theme", selected);
      applyTheme(selected);
      showToast(`Theme changed to ${e.target.options[e.target.selectedIndex].text}`, "success");
    });
  }

  if (fontSizeSelect) {
    fontSizeSelect.addEventListener("change", (e) => {
      const selected = e.target.value;
      localStorage.setItem("pref_font_size", selected);
      applyFontSize(selected);
      showToast(`Font size set to ${e.target.options[e.target.selectedIndex].text}`, "success");
    });
  }

  // Bind Data Actions
  if (btnExportHistory) {
    btnExportHistory.addEventListener("click", async () => {
      try {
        const res = await fetch("/api/history");
        const data = await res.json();
        
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `resumedesk_history_${new Date().toISOString().slice(0,10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        
        showToast("History data exported successfully", "success");
      } catch (err) {
        console.error(err);
        showToast("Failed to export history data", "error");
      }
    });
  }

  if (btnDeleteAccount) {
    btnDeleteAccount.addEventListener("click", async () => {
      if (confirm("WARNING: This will permanently delete your account and clear all saved chats/analyses. This action cannot be undone. Do you wish to proceed?")) {
        try {
          const response = await fetch("/api/history/clear-all", {
            method: "POST"
          });
          const resData = await response.json();
          if (resData.success) {
            showToast("Profile data deleted. Logging out...", "info");
            localStorage.removeItem("user_session");
            localStorage.removeItem("pref_theme");
            localStorage.removeItem("pref_font_size");
            setTimeout(() => {
              window.location.href = "/login";
            }, 1500);
          } else {
            showToast(resData.message || "Failed to clear database.", "error");
          }
        } catch (err) {
          console.error(err);
          showToast("Failed to delete account.", "error");
        }
      }
    });
  }

  // Helper Functions
  function populateProfileDetails() {
    const sessionStr = localStorage.getItem("user_session");
    if (sessionStr) {
      try {
        const user = JSON.parse(sessionStr);
        if (settingsName) settingsName.textContent = user.name || "User Account";
        if (settingsEmail) settingsEmail.textContent = user.email || "No Email Provided";
        if (settingsAvatar) {
          if (user.picture) {
            settingsAvatar.innerHTML = `<img src="${user.picture}" alt="${user.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
          } else {
            const initials = user.name ? user.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "US";
            settingsAvatar.textContent = initials;
          }
        }
      } catch (e) {
        console.error("Error parsing user session for settings:", e);
      }
    }
  }

  function applyTheme(theme) {
    document.body.classList.remove("theme-midnight-blue", "theme-emerald-teal");
    if (theme !== "space-dark") {
      document.body.classList.add(`theme-${theme}`);
    }
  }

  function applyFontSize(size) {
    document.body.classList.remove("font-normal", "font-large", "font-xlarge");
    document.body.classList.add(size);
  }
}

// ==========================================================================
// INITIAL SETUP
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Bind Settings Modal and User Session slots
  initSettingsModal();
  initUserSession();

  // Load history from SQLite database on launch. If history exists, load the first item,
  // otherwise open the clean welcome chat instructions.
  fetch("/api/history")
    .then(res => res.json())
    .then(data => {
      if (data.items && data.items.length > 0) {
        // Load the most recent history item
        loadHistory(data.items[0].id);
      } else {
        startNewSession();
        loadHistory();
      }
    })
    .catch(err => {
      console.error(err);
      startNewSession();
      loadHistory();
    });
});

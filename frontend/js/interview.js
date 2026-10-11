const startForm = document.getElementById("startInterviewForm");
const interviewFileInput = document.getElementById("interviewResumeFile");
const uploadLabel = document.getElementById("uploadLabel");
const jobDescription = document.getElementById("jobDescription");
const startBtn = document.getElementById("startBtn");

const setupCard = document.getElementById("setupCard");
const chatCard = document.getElementById("chatCard");
const chatWindow = document.getElementById("chatWindow");
const answerArea = document.getElementById("answerArea");
const answerInput = document.getElementById("answerInput");
const submitAnswerBtn = document.getElementById("submitAnswerBtn");
const afterAnswerArea = document.getElementById("afterAnswerArea");
const nextQuestionBtn = document.getElementById("nextQuestionBtn");
const finishInterviewBtn = document.getElementById("finishInterviewBtn");

const summaryCard = document.getElementById("summaryCard");
const summaryOutput = document.getElementById("summaryOutput");

let sessionId = null;

setUploadLabel(interviewFileInput, uploadLabel);

function addBubble(text, sender) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${sender}`;
  bubble.textContent = text;
  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return bubble;
}

startForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!interviewFileInput.files.length) return;

  startBtn.disabled = true;
  startBtn.textContent = "Starting...";

  const formData = new FormData();
  formData.append("file", interviewFileInput.files[0]);
  formData.append("job_description", jobDescription.value);

  try {
    const response = await fetch("/api/resume/start-interview", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Could not start interview.");
    }

    const data = await response.json();
    sessionId = data.session_id;

    setupCard.style.display = "none";
    chatCard.style.display = "block";
    addBubble(data.question, "ai");
  } catch (err) {
    alert(err.message);
  } finally {
    startBtn.disabled = false;
    startBtn.textContent = "Start Interview";
  }
});

submitAnswerBtn.addEventListener("click", async () => {
  const answer = answerInput.value.trim();
  if (!answer) return;

  addBubble(answer, "user");
  answerInput.value = "";
  submitAnswerBtn.disabled = true;
  answerArea.style.display = "none";

  const feedbackBubble = addBubble("", "ai");

  try {
    const response = await fetch("/api/interview/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, answer }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Something went wrong.");
    }

    await streamIntoElement(response, feedbackBubble);
    afterAnswerArea.style.display = "flex";
  } catch (err) {
    feedbackBubble.textContent = `Error: ${err.message}`;
  } finally {
    submitAnswerBtn.disabled = false;
  }
});

nextQuestionBtn.addEventListener("click", async () => {
  nextQuestionBtn.disabled = true;

  try {
    const response = await fetch("/api/interview/next-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Could not get next question.");
    }

    const data = await response.json();
    addBubble(data.question, "ai");

    afterAnswerArea.style.display = "none";
    answerArea.style.display = "block";
  } catch (err) {
    alert(err.message);
  } finally {
    nextQuestionBtn.disabled = false;
  }
});

finishInterviewBtn.addEventListener("click", async () => {
  finishInterviewBtn.disabled = true;

  try {
    const response = await fetch("/api/interview/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId }),
    });

    const data = await response.json();

    chatCard.style.display = "none";
    summaryCard.style.display = "block";

    let html = `<p><strong>Questions answered:</strong> ${data.questions_asked}</p>`;
    html += `<p><strong>Average score:</strong> ${data.average_score ?? "N/A"} / 10</p><hr/>`;

    data.history.forEach((h, i) => {
      html += `<p><strong>Q${i + 1}:</strong> ${h.question}</p>`;
      if (h.feedback) {
        html += `<div class="streamed-output">${h.feedback}</div><hr/>`;
      }
    });

    summaryOutput.innerHTML = html;
  } catch (err) {
    alert("Could not load summary: " + err.message);
  } finally {
    finishInterviewBtn.disabled = false;
  }
});

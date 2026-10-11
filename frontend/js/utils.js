/**
 * Streams a fetch Response body into a target element, appending text
 * chunks as they arrive so it renders progressively (like a typing effect).
 *
 * @param {Response} response - a fetch() response with a readable stream body
 * @param {HTMLElement} targetEl - element to append streamed text into
 * @param {function} onDone - optional callback with the full accumulated text
 */
async function streamIntoElement(response, targetEl, onDone) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    fullText += chunk;
    targetEl.textContent = fullText;
    targetEl.scrollTop = targetEl.scrollHeight;
  }

  if (onDone) onDone(fullText);
  return fullText;
}

/**
 * Finds a "## Overall Score\nX/10" pattern in AI output text and injects
 * a stamped score badge at the top of the target element.
 */
function injectScoreStamp(targetEl, fullText) {
  const match = fullText.match(/##\s*Overall Score\s*\n[^\d]*(\d{1,2})\s*\/\s*10/i)
    || fullText.match(/(\d{1,2})\s*\/\s*10/);
  if (!match) return;

  const score = match[1];
  const stamp = document.createElement("div");
  stamp.className = "score-stamp";
  stamp.innerHTML = `<span class="num">${score}</span><span class="denom">/ 10</span>`;
  targetEl.prepend(stamp);
}

function setUploadLabel(fileInput, labelEl) {
  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      labelEl.textContent = `✅ ${fileInput.files[0].name}`;
    }
  });
}

const form = document.getElementById("analyzeForm");
const fileInput = document.getElementById("resumeFile");
const uploadLabel = document.getElementById("uploadLabel");
const jobDescription = document.getElementById("jobDescription");
const analyzeBtn = document.getElementById("analyzeBtn");
const resultsCard = document.getElementById("resultsCard");
const resultsOutput = document.getElementById("resultsOutput");
const goToInterview = document.getElementById("goToInterview");

setUploadLabel(fileInput, uploadLabel);

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!fileInput.files.length) return;

  analyzeBtn.disabled = true;
  analyzeBtn.textContent = "Analyzing...";
  resultsCard.style.display = "block";
  resultsOutput.textContent = "";
  goToInterview.style.display = "none";
  resultsCard.scrollIntoView({ behavior: "smooth" });

  const formData = new FormData();
  formData.append("file", fileInput.files[0]);
  formData.append("job_description", jobDescription.value);

  try {
    const response = await fetch("/api/resume/analyze", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Something went wrong.");
    }

    await streamIntoElement(response, resultsOutput, (fullText) => {
      goToInterview.style.display = "inline-block";
      injectScoreStamp(resultsOutput, fullText);
    });
  } catch (err) {
    resultsOutput.textContent = `Error: ${err.message}`;
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = "Analyze Resume";
  }
});

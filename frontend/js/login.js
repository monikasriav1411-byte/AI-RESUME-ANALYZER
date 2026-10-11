/* ==========================================================================
   RESUMEDESK — LOGIN PAGE SCRIPT
   --------------------------------------------------------------------------
   SECTION 1: AUTH LOGIC — moved out of the old inline <script> as-is.
              No behavior, IDs, endpoints, or event handlers were changed.
   SECTION 2: DECORATIVE EFFECTS — new. Floating icons, cursor glow, mouse
              particles, button ripple. Purely visual, never touches
              anything auth-related and fails silently if elements move.
   ========================================================================== */

/* ============================================================
   SECTION 1 — AUTH LOGIC (unchanged from original login.html)
   ============================================================ */
const errorBanner = document.getElementById("errorBanner");
const errorMessage = document.getElementById("errorMessage");
const googleBtn = document.getElementById("googleBtn");
const googleBtnText = document.getElementById("googleBtnText");

let googleClientId = "";

function showError(message) {
  errorMessage.textContent = message;
  errorBanner.style.display = "flex";
}

function hideError() {
  errorBanner.style.display = "none";
}

// Set user session in localStorage and redirect
function handleSuccessLogin(user) {
  localStorage.setItem("user_session", JSON.stringify(user));
  window.location.href = "/";
}

// Callback handler for official Google authentication token response
async function handleAccessTokenResponse(accessToken) {
  try {
    hideError();
    googleBtnText.textContent = "Verifying...";
    googleBtn.disabled = true;

    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.detail || "Google verification failed.");
    }

    handleSuccessLogin(data.user);

  } catch (err) {
    showError(err.message);
    googleBtnText.textContent = "Continue with Google";
    googleBtn.disabled = false;
  }
}

// Initialize Mock Login Process
function handleMockGoogleLogin() {
  hideError();
  googleBtnText.textContent = "Connecting (Mock)...";
  googleBtn.disabled = true;

  setTimeout(async () => {
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: "mock_google_oauth_bypass_key_123" })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "Mock login failed.");
      }

      handleSuccessLogin(data.user);

    } catch (err) {
      showError(err.message);
      googleBtnText.textContent = "Continue with Google";
      googleBtn.disabled = false;
    }
  }, 1000);
}

// Check for configured Client ID and bootstrap OAuth on document load
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("/api/auth/config");
    const config = await res.json();
    googleClientId = config.google_client_id;

    if (googleClientId && googleClientId.trim() !== "") {
      // Real Google Client configured: Initialize official OAuth SDK
      const initInterval = setInterval(() => {
        if (typeof google !== "undefined" && google.accounts && google.accounts.oauth2) {
          clearInterval(initInterval);

          // Initialize Google's token client programmatically
          const client = google.accounts.oauth2.initTokenClient({
            client_id: googleClientId,
            scope: "profile email",
            prompt: "select_account", // Forces the Google "Choose an account" screen on every sign-in
            callback: (tokenResponse) => {
              if (tokenResponse.error) {
                showError(tokenResponse.error_description || "Google Sign-In failed.");
                return;
              }
              handleAccessTokenResponse(tokenResponse.access_token);
            }
          });

          // Bind the programmatic popup trigger to our custom styled Google button
          googleBtn.addEventListener("click", () => {
            client.requestAccessToken();
          });
        }
      }, 100);
    } else {
      // No Client ID: Bind to developer mock sign-in handler
      console.log("No Google Client ID set in .env. Running in Mock Sign-In mode.");
      googleBtn.addEventListener("click", handleMockGoogleLogin);
    }

  } catch (err) {
    console.error("Could not fetch auth configuration:", err);
    // Fall back to Mock mode on network failures
    googleBtn.addEventListener("click", handleMockGoogleLogin);
  }
});

/* ============================================================
   SECTION 2 — DECORATIVE EFFECTS (new, purely cosmetic)
   Everything below is wrapped defensively so that if a decorative
   element is ever removed from the HTML, the login flow above is
   completely unaffected.
   ============================================================ */
(function initLoginDecor() {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 2a. Floating background icons ---------- */
  const iconLibrary = [
    // Resume document
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M15 3v4h4"/><path d="M8 13h8M8 16h8M8 10h4"/></svg>',
    // PDF file
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M6 3h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M15 3v4h4"/><text x="7" y="17" font-size="6" fill="currentColor" stroke="none" font-family="sans-serif">PDF</text></svg>',
    // AI chip
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M9.5 9.5h5v5h-5z"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>',
    // Search / magnifying glass
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.7-4.7"/></svg>',
    // Check mark badge
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/></svg>',
    // Skill / star badge
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z"/></svg>',
    // Code brackets
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M8 5L3 12l5 7"/><path d="M16 5l5 7-5 7"/></svg>',
    // Small graph / bar chart
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    // Certificate
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="12" rx="1.5"/><circle cx="12" cy="17.5" r="2.5"/><path d="M10 19.5l-1 3 3-1.5 3 1.5-1-3"/></svg>',
    // Document folder
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 7a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>',
    // Neural network node
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M6.7 7.2L10.2 11M6.7 16.8L10.2 13M13.8 11L17.3 7.2M13.8 13L17.3 16.8"/></svg>',
    // Data particle / dot cluster
    '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="6" cy="6" r="1.6"/><circle cx="13" cy="4" r="1.1"/><circle cx="18" cy="9" r="1.8"/><circle cx="8" cy="14" r="1.3"/><circle cx="16" cy="17" r="1.5"/><circle cx="4" cy="18" r="1.1"/></svg>'
  ];

  const bgIconContainer = document.getElementById("bgIcons");
  const accentColors = ["var(--accent-blue)", "var(--accent-cyan)", "var(--accent-purple)"];

  let placedIcons = [];

  if (bgIconContainer && !prefersReducedMotion) {
    const ICON_COUNT = window.innerWidth < 640 ? 9 : 16;
    const frag = document.createDocumentFragment();

    for (let i = 0; i < ICON_COUNT; i++) {
      const wrap = document.createElement("div");
      wrap.className = "bg-icon";
      wrap.innerHTML = iconLibrary[i % iconLibrary.length];

      const size = 22 + Math.random() * 24; // 22px - 46px
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      const dx = (Math.random() * 120 - 60).toFixed(0) + "px";
      const dy = (Math.random() * 120 - 60).toFixed(0) + "px";
      const dur = (14 + Math.random() * 14).toFixed(1) + "s";
      const delay = (-Math.random() * 20).toFixed(1) + "s";
      const opacity = (0.12 + Math.random() * 0.14).toFixed(2);
      const color = accentColors[i % accentColors.length];

      wrap.style.setProperty("--size", size.toFixed(0) + "px");
      wrap.style.setProperty("--dx", dx);
      wrap.style.setProperty("--dy", dy);
      wrap.style.setProperty("--dur", dur);
      wrap.style.setProperty("--delay", delay);
      wrap.style.setProperty("--icon-opacity", opacity);
      wrap.style.setProperty("--icon-color", color);
      wrap.style.top = top + "%";
      wrap.style.left = left + "%";

      frag.appendChild(wrap);
      placedIcons.push(wrap);
    }

    bgIconContainer.appendChild(frag);
  }

  /* ---------- 2b. Cursor glow + proximity reaction on icons ---------- */
  const cursorGlow = document.getElementById("cursorGlow");
  const particleField = document.getElementById("particleField");
  const particleColors = ["#3b82f6", "#22d3ee", "#a855f7"];

  let rafId = null;
  let lastMouse = { x: 0, y: 0 };
  let lastParticleTime = 0;

  function updateCursorGlow() {
    if (cursorGlow) {
      cursorGlow.style.transform = `translate3d(${lastMouse.x}px, ${lastMouse.y}px, 0)`;
      cursorGlow.style.opacity = "1";
    }

    // Nearby icons react slightly
    if (placedIcons.length) {
      const threshold = 160;
      for (const el of placedIcons) {
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dist = Math.hypot(cx - lastMouse.x, cy - lastMouse.y);
        if (dist < threshold) {
          el.classList.add("icon-active");
        } else {
          el.classList.remove("icon-active");
        }
      }
    }

    rafId = null;
  }

  function onMouseMove(e) {
    lastMouse.x = e.clientX;
    lastMouse.y = e.clientY;

    if (!rafId) {
      rafId = requestAnimationFrame(updateCursorGlow);
    }

    // Spawn a soft trailing particle, throttled for performance
    const now = performance.now();
    if (!prefersReducedMotion && particleField && now - lastParticleTime > 55) {
      lastParticleTime = now;
      spawnParticle(e.clientX, e.clientY);
    }
  }

  function spawnParticle(x, y) {
    const p = document.createElement("div");
    p.className = "mouse-particle";
    const color = particleColors[Math.floor(Math.random() * particleColors.length)];
    const px = (Math.random() * 30 - 15).toFixed(0) + "px";
    const py = (-20 - Math.random() * 20).toFixed(0) + "px";

    p.style.left = x + "px";
    p.style.top = y + "px";
    p.style.setProperty("--p-color", color);
    p.style.setProperty("--px", px);
    p.style.setProperty("--py", py);

    particleField.appendChild(p);
    p.addEventListener("animationend", () => p.remove(), { once: true });
  }

  if (!prefersReducedMotion) {
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("mouseleave", () => {
      if (cursorGlow) cursorGlow.style.opacity = "0";
    });
  }

  /* ---------- 2c. Ripple effect on the Google button ---------- */
  if (googleBtn) {
    googleBtn.addEventListener("click", function (e) {
      const rect = googleBtn.getBoundingClientRect();
      const ripple = document.createElement("span");
      const size = Math.max(rect.width, rect.height) * 1.4;

      ripple.className = "btn-ripple";
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = (e.clientX - rect.left - size / 2) + "px";
      ripple.style.top = (e.clientY - rect.top - size / 2) + "px";

      googleBtn.appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
    });
  }
})();

const API = "https://ypedqbffumjwccqmgauo.supabase.co/functions/v1/equal-world-api-v2";

document.getElementById("year").textContent = new Date().getFullYear();

async function apiCall(action, payload = {}) {
  const response = await fetch(API, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({action, ...payload})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) throw new Error(data.error || "Request failed");
  return data;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

const trackingForm = document.getElementById("trackingForm");
trackingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const number = document.getElementById("trackingNumber").value.trim().toUpperCase();
  const result = document.getElementById("trackingResult");
  result.classList.remove("hidden");
  result.innerHTML = "<p>Loading live shipment data…</p>";
  try {
    const data = await apiCall("track", {tracking_code: number});
    const shipment = data.shipment || data;
    const events = data.events || [];
    const current = events.length ? events[events.length - 1] : null;
    const mapPlace = current?.location || shipment.destination || "";
    result.innerHTML = `
      <h3>Shipment ${escapeHtml(shipment.tracking_code)}</h3>
      <p><span class="status">${escapeHtml(shipment.status || "Unknown")}</span></p>
      <p><strong>Origin:</strong> ${escapeHtml(shipment.origin || "—")}<br>
      <strong>Current location:</strong> ${escapeHtml(mapPlace || "—")}<br>
      <strong>Destination:</strong> ${escapeHtml(shipment.destination || "—")}<br>
      <strong>Service:</strong> ${escapeHtml(shipment.service || "—")}<br>
      <strong>Estimated delivery:</strong> ${escapeHtml(shipment.estimated_delivery || "—")}</p>
      ${mapPlace ? `<p><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapPlace)}" target="_blank" rel="noopener">📍 View current location on Google Maps</a></p>` : ""}
      <div class="timeline">${events.map(ev => `
        <div><strong>${escapeHtml(ev.status || "")}</strong><br>
        <span>${escapeHtml(ev.location || "")}</span>
        ${ev.description ? `<br><small>${escapeHtml(ev.description)}</small>` : ""}
        ${ev.event_time ? `<br><small>${escapeHtml(new Date(ev.event_time).toLocaleString())}</small>` : ""}</div>
      `).join("")}</div>`;
  } catch (err) {
    result.innerHTML = `<h3>Tracking number not found</h3><p>${escapeHtml(err.message)}</p>`;
  }
});

const chatToggle = document.getElementById("chatToggle");
const chatPanel = document.getElementById("chatPanel");
const chatClose = document.getElementById("chatClose");
const chatStart = document.getElementById("chatStart");
const chatBody = document.getElementById("chatBody");
const chatError = document.getElementById("chatError");
const chatStatus = document.getElementById("chatStatus");
let chatSessionId = sessionStorage.getItem("eqws_chat_session");
let chatPoll = null;

chatToggle.addEventListener("click", () => chatPanel.classList.remove("hidden"));
chatClose.addEventListener("click", () => chatPanel.classList.add("hidden"));

async function loadChatMessages() {
  if (!chatSessionId) return;
  try {
    const data = await apiCall("chat_messages", {session_id: chatSessionId});
    const messages = data.messages || [];
    const box = document.getElementById("chatMessages");
    box.innerHTML = messages.map(m => `
      <div class="chat-message ${m.sender === "visitor" ? "visitor" : "agent"}">
        <strong>${m.sender === "visitor" ? "You" : "Support"}</strong>
        <p>${escapeHtml(m.message)}</p>
        <small>${m.sent_at ? escapeHtml(new Date(m.sent_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})) : ""}</small>
      </div>`).join("");
    box.scrollTop = box.scrollHeight;
  } catch (err) {
    chatStatus.textContent = "Unable to refresh messages right now.";
  }
}

async function startChat() {
  const visitor_name = document.getElementById("chatName").value.trim();
  const visitor_email = document.getElementById("chatEmail").value.trim();
  chatError.textContent = "";
  if (!visitor_name || !visitor_email) {
    chatError.textContent = "Please enter your name and email.";
    return;
  }
  try {
    const data = await apiCall("chat_start", {visitor_name, visitor_email});
    chatSessionId = data.session_id || data.session?.id;
    if (!chatSessionId) throw new Error("Unable to start chat.");
    sessionStorage.setItem("eqws_chat_session", chatSessionId);
    chatStart.classList.add("hidden");
    chatBody.classList.remove("hidden");
    await loadChatMessages();
    clearInterval(chatPoll);
    chatPoll = setInterval(loadChatMessages, 5000);
  } catch (err) {
    chatError.textContent = err.message;
  }
}

document.getElementById("chatStartBtn").addEventListener("click", startChat);

document.getElementById("chatForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message || !chatSessionId) return;
  chatStatus.textContent = "Sending…";
  try {
    await apiCall("chat_message", {session_id: chatSessionId, message});
    input.value = "";
    chatStatus.textContent = "";
    await loadChatMessages();
  } catch (err) {
    chatStatus.textContent = err.message;
  }
});

if (chatSessionId) {
  chatStart.classList.add("hidden");
  chatBody.classList.remove("hidden");
  loadChatMessages();
  chatPoll = setInterval(loadChatMessages, 5000);
}

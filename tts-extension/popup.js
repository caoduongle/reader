const $ = (id) => document.getElementById(id);

async function loadSettings() {
  const { apiKey, voice, rate, provider } = await chrome.storage.sync.get(["apiKey", "voice", "rate", "provider"]);
  if (apiKey) $("apiKey").value = apiKey;
  if (voice) $("voice").value = voice;
  if (rate) $("rate").value = String(rate);
  $("provider").value = provider || "gemini";
  toggleProviderFields();
}

function toggleProviderFields() {
  const isLocal = $("provider").value === "local";
  $("apiKey").closest("div") ? null : null;
  document.getElementById("apiKey").parentElement.style.display = isLocal ? "none" : "block";
  document.getElementById("apiKey").previousElementSibling.style.display = isLocal ? "none" : "block";
}

async function saveSettings(showStatus = true) {
  const apiKey = $("apiKey").value.trim();
  const voice = $("voice").value;
  const rate = parseFloat($("rate").value);
  const provider = $("provider").value;
  await chrome.storage.sync.set({ apiKey, voice, rate, provider });
  if (showStatus) {
    $("status").textContent = "Đã lưu cài đặt ✓";
    setTimeout(() => ($("status").textContent = ""), 1500);
  }
}

$("provider").addEventListener("change", toggleProviderFields);
$("save").addEventListener("click", () => saveSettings(true));

$("start").addEventListener("click", async () => {
  await saveSettings(false);
  const { apiKey, provider } = await chrome.storage.sync.get(["apiKey", "provider"]);
  if ((provider || "gemini") === "gemini" && !apiKey) {
    $("status").style.color = "#dc2626";
    $("status").textContent = "Vui lòng nhập Gemini API key trước.";
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.tabs.sendMessage(tab.id, { type: "TTS_TOGGLE_READER" }, () => {
    // ignore errors if content script not ready; user can reload page
    window.close();
  });
});

loadSettings();

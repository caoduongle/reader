(() => {
  if (window.__aiTtsReaderInjected) return;
  window.__aiTtsReaderInjected = true;

  let queue = [];       // { el, text }
  let currentIndex = -1;
  let isPlaying = false;
  let isLoading = false;
  let currentAudio = null;
  let settings = { voice: "Kore", rate: 1, provider: "gemini" };
  let playerEl, settingsEl;

  // Cache audio đã tạo trong phiên hiện tại: text -> objectURL (tránh gọi lại API)
  const audioCache = new Map();
  // Các đoạn đang được prefetch song song (tránh gọi trùng lặp)
  const inFlight = new Map();

  // Tách 1 đoạn văn dài thành các câu ngắn (giảm thời gian chờ phản hồi đầu tiên
  // và giúp prefetch câu kế tiếp mượt hơn thay vì chờ cả đoạn dài).
  function splitIntoSentences(text) {
    const parts = text.match(/[^.!?…]+[.!?…]*(\s|$)/g) || [text];
    const merged = [];
    let buffer = "";
    for (const p of parts) {
      buffer += p;
      // gộp các câu quá ngắn lại để tránh gọi API quá nhiều lần vặt vãnh
      if (buffer.trim().length >= 60) {
        merged.push(buffer.trim());
        buffer = "";
      }
    }
    if (buffer.trim()) merged.push(buffer.trim());
    return merged.length ? merged : [text];
  }

  // ---------- 1. Thu thập văn bản trên trang theo thứ tự đọc ----------
  function collectReadableBlocks() {
    // Nếu người dùng đang bôi đen (select) một đoạn -> chỉ đọc đoạn đó
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 20) {
      const text = selection.toString().trim();
      return splitIntoSentences(text).map((t) => ({ el: null, text: t }));
    }

    const candidates = Array.from(document.querySelectorAll("p, article, .content, .chapter-content"));
    const seen = new Set();
    const blocks = [];

    for (const el of candidates) {
      if (el.closest("#ai-tts-player, #ai-tts-settings")) continue;
      if (seen.has(el)) continue;
      const text = el.innerText?.trim();
      if (!text || text.length < 25) continue;
      // Bỏ qua phần tử con của phần tử đã lấy (tránh trùng lặp article > p)
      if (blocks.some((b) => b.el && b.el.contains(el))) continue;
      seen.add(el);
      // Mỗi đoạn dài được tách thành các câu ngắn, nhưng vẫn highlight cả khối `el`
      for (const sentence of splitIntoSentences(text)) {
        blocks.push({ el, text: sentence });
      }
    }
    return blocks;
  }

  // ---------- 2. Chuyển audio (PCM hoặc WAV base64) -> Blob URL phát được ----------
  function pcmBase64ToWavUrl(base64Pcm, sampleRate = 24000, numChannels = 1, bitsPerSample = 16) {
    const binary = atob(base64Pcm);
    const pcmLen = binary.length;
    const buffer = new ArrayBuffer(44 + pcmLen);
    const view = new DataView(buffer);

    const writeStr = (offset, str) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;

    writeStr(0, "RIFF");
    view.setUint32(4, 36 + pcmLen, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeStr(36, "data");
    view.setUint32(40, pcmLen, true);

    for (let i = 0; i < pcmLen; i++) view.setUint8(44 + i, binary.charCodeAt(i));

    const blob = new Blob([buffer], { type: "audio/wav" });
    return URL.createObjectURL(blob);
  }

  function wavBase64ToUrl(base64Wav) {
    const binary = atob(base64Wav);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "audio/wav" });
    return URL.createObjectURL(blob);
  }

  function audioResultToUrl(res) {
    return res.kind === "wav"
      ? wavBase64ToUrl(res.base64Wav)
      : pcmBase64ToWavUrl(res.base64Pcm, res.sampleRate);
  }

  // ---------- 3. Gọi background để lấy audio (có cache + gộp request trùng) ----------
  function cacheKey(text) {
    return `${settings.provider || "gemini"}::${settings.voice}::${text}`;
  }

  function requestSpeech(text) {
    const key = cacheKey(text);
    if (audioCache.has(key)) return Promise.resolve(audioCache.get(key));
    if (inFlight.has(key)) return inFlight.get(key);

    const promise = new Promise((resolve, reject) => {
      chrome.storage.sync.get(["apiKey", "voice", "rate", "provider"], (cfg) => {
        const provider = cfg.provider || "gemini";
        if (provider === "gemini" && !cfg.apiKey) {
          reject(new Error("Chưa có Gemini API key. Mở popup extension để nhập key."));
          return;
        }
        settings.voice = cfg.voice || settings.voice;
        settings.rate = cfg.rate || settings.rate;
        settings.provider = provider;

        chrome.runtime.sendMessage(
          { type: "TTS_SYNTHESIZE", text, voiceName: settings.voice, apiKey: cfg.apiKey, provider },
          (res) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!res?.ok) {
              reject(new Error(res?.error || "Lỗi không xác định khi tạo giọng đọc."));
              return;
            }
            const url = audioResultToUrl(res);
            audioCache.set(key, url);
            resolve(url);
          }
        );
      });
    }).finally(() => inFlight.delete(key));

    inFlight.set(key, promise);
    return promise;
  }

  // Gọi trước (không chờ) audio cho đoạn kế tiếp, để khi đoạn hiện tại đọc xong
  // thì đoạn sau đã sẵn sàng phát ngay, không có khoảng chờ giữa các đoạn.
  function prefetch(i) {
    if (i < 0 || i >= queue.length) return;
    const text = queue[i].text;
    const key = cacheKey(text);
    if (audioCache.has(key) || inFlight.has(key)) return;
    requestSpeech(text).catch(() => {}); // lỗi sẽ được xử lý lại khi thực sự phát tới đoạn này
  }

  // ---------- 4. Highlight đoạn đang đọc ----------
  function clearHighlight() {
    document.querySelectorAll(".ai-tts-highlight").forEach((el) => el.classList.remove("ai-tts-highlight"));
  }

  function highlightCurrent() {
    clearHighlight();
    const block = queue[currentIndex];
    if (block?.el) {
      block.el.classList.add("ai-tts-highlight");
      block.el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  // ---------- 5. Điều khiển phát ----------
  async function playIndex(i) {
    if (i < 0 || i >= queue.length) {
      stopReading();
      return;
    }
    currentIndex = i;
    highlightCurrent();
    setLoading(true);
    try {
      const url = await requestSpeech(queue[i].text);
      setLoading(false);
      if (currentAudio) {
        currentAudio.pause();
      }
      currentAudio = new Audio(url);
      currentAudio.playbackRate = settings.rate || 1;
      // Ngay khi đoạn này bắt đầu phát, tải trước 1-2 đoạn kế tiếp ở nền.
      prefetch(i + 1);
      prefetch(i + 2);
      currentAudio.onended = () => {
        if (isPlaying) playIndex(currentIndex + 1);
      };
      isPlaying = true;
      updatePlayButton();
      await currentAudio.play();
    } catch (err) {
      setLoading(false);
      console.error("[AI TTS Reader]", err);
      showToast(err.message);
      isPlaying = false;
      updatePlayButton();
    }
  }

  function togglePlayPause() {
    if (!queue.length) {
      queue = collectReadableBlocks();
      if (!queue.length) {
        showToast("Không tìm thấy nội dung để đọc trên trang này.");
        return;
      }
    }
    if (isPlaying) {
      isPlaying = false;
      currentAudio?.pause();
      updatePlayButton();
    } else if (currentAudio && currentIndex >= 0 && !currentAudio.ended) {
      isPlaying = true;
      currentAudio.play();
      updatePlayButton();
    } else {
      playIndex(currentIndex < 0 ? 0 : currentIndex);
    }
  }

  function stopReading() {
    isPlaying = false;
    currentAudio?.pause();
    currentAudio = null;
    currentIndex = -1;
    clearHighlight();
    updatePlayButton();
  }

  function next() { playIndex(currentIndex + 1); }
  function prev() { playIndex(Math.max(0, currentIndex - 1)); }

  // ---------- 6. UI ----------
  function setLoading(loading) {
    isLoading = loading;
    const btn = playerEl?.querySelector(".ai-tts-play");
    if (!btn) return;
    btn.innerHTML = loading ? "⏳" : isPlaying ? "⏸" : "▶";
    btn.classList.toggle("ai-tts-loading", loading);
  }

  function updatePlayButton() {
    const btn = playerEl?.querySelector(".ai-tts-play");
    if (!btn || isLoading) return;
    btn.innerHTML = isPlaying ? "⏸" : "▶";
  }

  function showToast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    Object.assign(t.style, {
      position: "fixed", bottom: "90px", right: "24px", zIndex: 2147483647,
      background: "#1a1a1a", color: "#fff", padding: "10px 14px", borderRadius: "10px",
      fontSize: "12px", maxWidth: "280px", fontFamily: "sans-serif",
    });
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  function buildPlayer() {
    if (playerEl) return;
    playerEl = document.createElement("div");
    playerEl.id = "ai-tts-player";
    playerEl.innerHTML = `
      <div class="ai-tts-icon">🔊</div>
      <div class="ai-tts-label">
        <div class="ai-tts-title">Đọc tự động</div>
        <div class="ai-tts-sub">Gemini AI Voice</div>
      </div>
      <button class="ai-tts-btn ai-tts-prev" title="Đoạn trước">⏮</button>
      <button class="ai-tts-btn ai-tts-play" title="Phát/Tạm dừng">▶</button>
      <button class="ai-tts-btn ai-tts-next" title="Đoạn sau">⏭</button>
      <button class="ai-tts-btn ai-tts-settings-btn" title="Cài đặt">⚙</button>
      <button class="ai-tts-btn ai-tts-close" title="Đóng">✕</button>
    `;
    document.body.appendChild(playerEl);

    playerEl.querySelector(".ai-tts-play").addEventListener("click", togglePlayPause);
    playerEl.querySelector(".ai-tts-prev").addEventListener("click", prev);
    playerEl.querySelector(".ai-tts-next").addEventListener("click", next);
    playerEl.querySelector(".ai-tts-close").addEventListener("click", destroyPlayer);
    playerEl.querySelector(".ai-tts-settings-btn").addEventListener("click", toggleSettings);

    makeDraggable(playerEl);
  }

  function buildSettings() {
    if (settingsEl) return;
    settingsEl = document.createElement("div");
    settingsEl.id = "ai-tts-settings";
    settingsEl.style.display = "none";
    settingsEl.innerHTML = `
      <h3>Cài đặt Text-to-Speech <span class="close">✕</span></h3>
      <label>Giọng đọc</label>
      <select id="ai-tts-voice-select">
        <option value="Kore">Kore (Nữ, ấm)</option>
        <option value="Puck">Puck (Nam, trẻ)</option>
        <option value="Charon">Charon (Nam, trầm)</option>
        <option value="Zephyr">Zephyr (Nữ, nhẹ)</option>
        <option value="Fenrir">Fenrir (Nam, mạnh)</option>
        <option value="Leda">Leda (Nữ, trẻ)</option>
        <option value="Orus">Orus (Nam, chững chạc)</option>
        <option value="Aoede">Aoede (Nữ, du dương)</option>
      </select>
      <label>Tốc độ đọc: <span id="ai-tts-rate-val">1x</span></label>
      <input type="range" id="ai-tts-rate-range" min="0.5" max="2" step="0.25" value="1" />
    `;
    document.body.appendChild(settingsEl);

    settingsEl.querySelector(".close").addEventListener("click", toggleSettings);
    const voiceSel = settingsEl.querySelector("#ai-tts-voice-select");
    const rateRange = settingsEl.querySelector("#ai-tts-rate-range");
    const rateVal = settingsEl.querySelector("#ai-tts-rate-val");

    chrome.storage.sync.get(["voice", "rate"], (cfg) => {
      if (cfg.voice) voiceSel.value = cfg.voice;
      if (cfg.rate) { rateRange.value = cfg.rate; rateVal.textContent = cfg.rate + "x"; }
    });

    voiceSel.addEventListener("change", () => {
      settings.voice = voiceSel.value;
      chrome.storage.sync.set({ voice: voiceSel.value });
    });
    rateRange.addEventListener("input", () => {
      settings.rate = parseFloat(rateRange.value);
      rateVal.textContent = rateRange.value + "x";
      if (currentAudio) currentAudio.playbackRate = settings.rate;
      chrome.storage.sync.set({ rate: settings.rate });
    });
  }

  function toggleSettings() {
    buildSettings();
    settingsEl.style.display = settingsEl.style.display === "none" ? "block" : "none";
  }

  function destroyPlayer() {
    stopReading();
    playerEl?.remove();
    settingsEl?.remove();
    playerEl = null;
    settingsEl = null;
    audioCache.forEach((url) => URL.revokeObjectURL(url));
    audioCache.clear();
    queue = [];
  }

  function makeDraggable(el) {
    let dragging = false, offsetX = 0, offsetY = 0;
    el.addEventListener("mousedown", (e) => {
      if (e.target.tagName === "BUTTON") return;
      dragging = true;
      offsetX = e.clientX - el.getBoundingClientRect().left;
      offsetY = e.clientY - el.getBoundingClientRect().top;
      el.style.cursor = "grabbing";
    });
    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      el.style.left = e.clientX - offsetX + "px";
      el.style.top = e.clientY - offsetY + "px";
      el.style.right = "auto";
      el.style.bottom = "auto";
      el.style.position = "fixed";
    });
    document.addEventListener("mouseup", () => {
      dragging = false;
      el.style.cursor = "grab";
    });
  }

  // ---------- 7. Nhận lệnh từ popup ----------
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "TTS_TOGGLE_READER") {
      if (playerEl) {
        destroyPlayer();
      } else {
        buildPlayer();
        queue = collectReadableBlocks();
        if (!queue.length) {
          showToast("Không tìm thấy nội dung để đọc trên trang này.");
        } else {
          playIndex(0);
        }
      }
      sendResponse({ ok: true });
    }
  });
})();

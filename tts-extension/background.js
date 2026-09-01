// Gọi Gemini TTS API và trả về audio dạng PCM base64 cho content script.
// Model TTS của Gemini: nhận text, trả về audio (PCM 16-bit, 24kHz, mono).

const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const LOCAL_SERVER_URL = "http://localhost:8008";

async function synthesizeSpeech(text, voiceName, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [
      {
        parts: [{ text }],
      },
    ],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName || "Kore" },
        },
      },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini TTS lỗi ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const part = data?.candidates?.[0]?.content?.parts?.[0];
  const inline = part?.inlineData;
  if (!inline?.data) {
    throw new Error("Không nhận được audio từ Gemini TTS.");
  }

  // mimeType thường dạng: audio/L16;codec=pcm;rate=24000
  const rateMatch = /rate=(\d+)/.exec(inline.mimeType || "");
  const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;

  return { kind: "pcm", base64Pcm: inline.data, sampleRate };
}

async function synthesizeSpeechLocal(text) {
  let res;
  try {
    res = await fetch(`${LOCAL_SERVER_URL}/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language: "vi" }),
    });
  } catch (e) {
    throw new Error(
      "Không kết nối được server giọng local (http://localhost:8008). Kiểm tra đã chạy `python server.py` trong WSL2 chưa."
    );
  }
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Server local lỗi ${res.status}: ${errText}`);
  }
  const buf = await res.arrayBuffer();
  // Trả về base64 của WAV nguyên bản (server local đã trả WAV sẵn, không cần đóng gói lại)
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64Wav = btoa(binary);
  return { kind: "wav", base64Wav };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "TTS_SYNTHESIZE") {
    const task =
      msg.provider === "local"
        ? synthesizeSpeechLocal(msg.text)
        : synthesizeSpeech(msg.text, msg.voiceName, msg.apiKey);

    task
      .then((result) => sendResponse({ ok: true, ...result }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true; // async response
  }
});

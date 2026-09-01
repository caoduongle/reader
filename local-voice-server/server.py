"""
Server local dùng viXTTS (fine-tune XTTS-v2 cho tiếng Việt) để clone giọng
từ file voice_sample.wav và đọc bất kỳ đoạn text nào bằng giọng đó.

Chạy: python server.py
Mặc định lắng nghe tại http://0.0.0.0:8008
"""

import io
import os
import wave
import hashlib

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from huggingface_hub import snapshot_download

from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import Xtts

MODEL_REPO = "capleaf/viXTTS"
MODEL_DIR = os.path.join(os.path.dirname(__file__), "model", "viXTTS")
VOICE_SAMPLE = os.path.join(os.path.dirname(__file__), "voice_sample.wav")
CACHE_DIR = os.path.join(os.path.dirname(__file__), "cache")

os.makedirs(CACHE_DIR, exist_ok=True)

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[viXTTS] Dùng thiết bị: {device}")

if not os.path.isdir(MODEL_DIR):
    print("[viXTTS] Đang tải model từ Hugging Face (lần đầu, ~2GB)...")
    snapshot_download(repo_id=MODEL_REPO, local_dir=MODEL_DIR)

print("[viXTTS] Đang load model...")
config = XttsConfig()
config.load_json(os.path.join(MODEL_DIR, "config.json"))
model = Xtts.init_from_config(config)
model.load_checkpoint(config, checkpoint_dir=MODEL_DIR, use_deepspeed=False)
model.to(device)
print("[viXTTS] Model đã sẵn sàng.")

if not os.path.isfile(VOICE_SAMPLE):
    print(f"[CẢNH BÁO] Chưa thấy file mẫu giọng tại: {VOICE_SAMPLE}")
    print("Hãy thu âm 10-30s giọng của bạn, lưu WAV mono 16-bit, đặt tên voice_sample.wav")

# Tính sẵn "điều kiện giọng nói" (speaker embedding) 1 lần khi khởi động,
# để mỗi lần đọc câu mới không phải phân tích lại file mẫu (nhanh hơn).
gpt_cond_latent, speaker_embedding = (None, None)


def load_speaker_conditioning():
    global gpt_cond_latent, speaker_embedding
    if not os.path.isfile(VOICE_SAMPLE):
        return
    print("[viXTTS] Đang phân tích giọng mẫu...")
    gpt_cond_latent, speaker_embedding = model.get_conditioning_latents(
        audio_path=[VOICE_SAMPLE],
        gpt_cond_len=30,
        max_ref_length=60,
    )
    print("[viXTTS] Đã sẵn sàng giọng clone.")


load_speaker_conditioning()

app = FastAPI(title="viXTTS Local Voice Server")

# Cho phép Chrome extension (content script chạy trên mọi trang) gọi vào server local.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SpeakRequest(BaseModel):
    text: str
    language: str = "vi"


def pcm_float_to_wav_bytes(wav_array, sample_rate=24000):
    """model.synthesize trả về numpy float32 [-1, 1] -> đóng gói thành WAV 16-bit."""
    import numpy as np

    pcm16 = (np.clip(wav_array, -1.0, 1.0) * 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm16.tobytes())
    return buf.getvalue()


@app.get("/health")
def health():
    return {
        "ok": True,
        "device": device,
        "voice_sample_loaded": gpt_cond_latent is not None,
    }


@app.post("/reload-voice")
def reload_voice():
    """Gọi lại sau khi bạn thay file voice_sample.wav bằng mẫu giọng mới."""
    load_speaker_conditioning()
    return {"ok": gpt_cond_latent is not None}


@app.post("/speak")
def speak(req: SpeakRequest):
    if gpt_cond_latent is None:
        raise HTTPException(
            400,
            "Chưa có giọng mẫu. Thêm file voice_sample.wav rồi gọi /reload-voice.",
        )
    text = req.text.strip()
    if not text:
        raise HTTPException(400, "Text rỗng.")

    # Cache theo hash nội dung để không phải tổng hợp lại câu đã đọc trước đó.
    cache_key = hashlib.sha1(f"{req.language}::{text}".encode("utf-8")).hexdigest()
    cache_path = os.path.join(CACHE_DIR, f"{cache_key}.wav")
    if os.path.isfile(cache_path):
        with open(cache_path, "rb") as f:
            return Response(content=f.read(), media_type="audio/wav")

    try:
        out = model.inference(
            text=text,
            language=req.language,
            gpt_cond_latent=gpt_cond_latent,
            speaker_embedding=speaker_embedding,
            temperature=0.65,
        )
    except Exception as e:
        raise HTTPException(500, f"Lỗi khi tổng hợp giọng nói: {e}")

    wav_bytes = pcm_float_to_wav_bytes(out["wav"], sample_rate=config.audio.output_sample_rate)
    with open(cache_path, "wb") as f:
        f.write(wav_bytes)

    return Response(content=wav_bytes, media_type="audio/wav")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8008)

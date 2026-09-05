"""
Server TTS + RVC local cho ung dung VoxRead (Electron desktop).

Pipeline:  text --(Edge-TTS)--> giong doc nen (mp3)  --(RVC)--> giong ca nhan (wav)

App VoxRead Electron goi toi:
    POST http://localhost:8008/speak
    body: { "text": "...", "language": "vi" }
    -> tra ve RAW BYTES cua file WAV (audio/wav)
"""

import asyncio
import os
import tempfile
import threading
import traceback

import edge_tts
from flask import Flask, request, Response, jsonify
from rvc_python.infer import RVCInference

# Thu muc chua chinh file server.py nay - dung lam goc cho moi duong dan ben duoi,
# de du chay tu dau (terminal o thu muc khac, Task Scheduler, Startup...) van dung.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def discover_model_paths(base_dir: str):
    """
    Quet thu muc model/ ben trong base_dir:
    - MODEL_PATH: file .pth dau tien theo thu tu abc (hoac None neu khong co)
    - INDEX_PATH: file .index dau tien theo thu tu abc (hoac "" neu khong co)
    """
    model_dir = os.path.join(base_dir, "model")
    if not os.path.isdir(model_dir):
        return None, ""

    pth_files = sorted([f for f in os.listdir(model_dir) if f.endswith(".pth") and not f.startswith(".")])
    index_files = sorted([f for f in os.listdir(model_dir) if f.endswith(".index") and not f.startswith(".")])

    model_path = os.path.join(model_dir, pth_files[0]) if pth_files else None
    index_path = os.path.join(model_dir, index_files[0]) if index_files else ""
    return model_path, index_path


# ============================================================
#  CAU HINH
# ============================================================

# Tu dong tim model trong thu muc python-backend/model/
MODEL_PATH, INDEX_PATH = discover_model_paths(BASE_DIR)

# Giong TTS nen (Edge-TTS) — nen chon giong CUNG GIOI TINH voi giong ban train
# de RVC phai bien doi it nhat, chat luong ra tot nhat.
#   Nam: vi-VN-NamMinhNeural   |   Nu: vi-VN-HoaiMyNeural
BASE_VOICE = "vi-VN-NamMinhNeural"

# Dich giong (semitone). De 0 neu BASE_VOICE cung gioi tinh voi giong ban train.
# +12 neu giong nen la Nam nhung giong dich la Nu, -12 neu nguoc lai.
PITCH_SHIFT = 0

# "cuda:0" neu may co GPU NVIDIA (da cai dung ban torch+CUDA, xem README).
# "cpu:0" neu khong co GPU rieng — van chay duoc, chi cham hon.
DEVICE = "cuda:0"

PORT = 8008

# Cac tham so chat luong RVC — muc mac dinh da hop ly, it khi can doi.
RVC_PARAMS = dict(
    f0method="rmvpe",       # thuat toan nhan dien cao do, nhe va chinh xac nhat hien nay
    f0up_key=PITCH_SHIFT,
    index_rate=0.75,        # 0.7-0.85: giong net, it bi "lai" giong nen
    filter_radius=3,
    resample_sr=0,          # 0 = giu nguyen sample rate dau ra cua model
    rms_mix_rate=0.25,
    protect=0.33,           # bao ve phu am/hoi tho, tranh vo tieng
)

# ============================================================

app = Flask(__name__)
rvc_lock = threading.Lock()  # tranh 2 request goi RVC cung luc (nhat la khi dung GPU)

rvc = None
if MODEL_PATH and os.path.isfile(MODEL_PATH):
    try:
        print(f"Dang tai model RVC tu: {MODEL_PATH} ... (lan dau se tu tai them hubert_base.pt + rmvpe.pt, ~200-300MB)")
        rvc = RVCInference(
            device=DEVICE,
            model_path=MODEL_PATH,
            index_path=INDEX_PATH,
            version="v2",
        )
        rvc.set_params(**RVC_PARAMS)
        print(f"Model san sang ({os.path.basename(MODEL_PATH)}). Server dang chay tai http://localhost:{PORT}  (giu cua so nay mo)")
    except Exception as e:
        rvc = None
        print(f"[VoxRead] Loi khi khoi tao model RVC ({MODEL_PATH}): {e}")
else:
    print("[VoxRead] Canh bao: Chua co model giong RVC (.pth) trong thu muc python-backend/model/, tinh nang RVC se khong kha dung cho toi khi ban them model.")


async def _synthesize_base(text: str, out_path: str):
    """Goi Edge-TTS de tao giong doc nen. Luu y: Edge-TTS luon tra ve MP3
    (audio-24khz-48kbitrate-mono-mp3) du duoi file la gi, nen ta dat ten
    file dung la .mp3 cho ro rang; RVC (qua PyAV) tu doc duoc dinh dang nay."""
    await edge_tts.Communicate(text, BASE_VOICE).save(out_path)


@app.route("/speak", methods=["POST", "OPTIONS"])
def speak():
    if request.method == "OPTIONS":
        return Response(status=204)

    if rvc is None:
        return jsonify({
            "error": "Chưa có model giọng RVC (.pth) trong thư mục python-backend/model/. Vui lòng copy file .pth (và .index nếu có) vào thư mục python-backend/model/ rồi restart server."
        }), 503

    data = request.get_json(force=True, silent=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "Thieu 'text' trong request"}), 400

    if len(text) > 10000:
        return jsonify({"error": "Độ dài văn bản vượt quá giới hạn tối đa (10,000 ký tự)."}), 400

    tmp_dir = tempfile.mkdtemp(prefix="tts_rvc_")
    base_path = os.path.join(tmp_dir, "base.mp3")
    out_path = os.path.join(tmp_dir, "out.wav")

    try:
        asyncio.run(_synthesize_base(text, base_path))

        with rvc_lock:
            rvc.infer_file(base_path, out_path)

        with open(out_path, "rb") as f:
            wav_bytes = f.read()

        return Response(wav_bytes, mimetype="audio/wav")

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "Đã xảy ra lỗi khi tổng hợp giọng nói."}), 500

    finally:
        for p in (base_path, out_path):
            if os.path.exists(p):
                os.remove(p)
        try:
            os.rmdir(tmp_dir)
        except OSError:
            pass


@app.after_request
def _add_cors_headers(resp):
    origin = request.headers.get("Origin")
    allowed_origins = {"http://localhost:3000", "http://127.0.0.1:3000", "null"}
    if origin and origin in allowed_origins:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    return resp


@app.route("/health", methods=["GET"])
def health():
    model_loaded = rvc is not None and getattr(rvc, "current_model", None) is not None
    return jsonify({"ok": True, "model_loaded": bool(model_loaded)})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=PORT, threaded=True)

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
import time
import traceback

import edge_tts
import torch

# --- Vá tuong thich PyTorch >= 2.6 cho fairseq (dependency cua rvc-python) ---
# Tu PyTorch 2.6, torch.load() mac dinh weights_only=True, chan viec load cac checkpoint
# cu (nhu hubert_base.pt) co chua object Python tuy bien (vd fairseq.data.dictionary.
# Dictionary). fairseq da ngung cap nhat tu 2022 nen khong tu truyen weights_only=False.
# hubert_base.pt / rmvpe.pt la file cong dong chuan, do chinh rvc_python tu tai ve tu
# nguon chinh thuc, nen an toan de khoi phuc hanh vi torch.load cu cho rieng file nay.
_original_torch_load = torch.load
def _patched_torch_load(*args, **kwargs):
    kwargs.setdefault("weights_only", False)
    return _original_torch_load(*args, **kwargs)
torch.load = _patched_torch_load
# --- Het phan va ---

from flask import Flask, request, Response, jsonify
from rvc_python.infer import RVCInference
from scipy.io import wavfile

# Thu muc chua chinh file server.py nay - dung lam goc cho moi duong dan ben duoi,
# de du chay tu dau (terminal o thu muc khac, Task Scheduler, Startup...) van dung.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")
os.makedirs(MODEL_DIR, exist_ok=True)


def discover_model_paths(base_dir: str):
    """
    Quet thu muc model/ ben trong base_dir:
    - MODEL_PATH: file .pth dau tien theo thu tu abc (hoac None neu khong co)
    - INDEX_PATH: file .index dau tien theo thu tu abc (hoac "" neu khong co)
    Tu dong tao thu muc model/ neu chua ton tai.
    """
    model_dir = os.path.join(base_dir, "model")
    os.makedirs(model_dir, exist_ok=True)

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


def detect_device() -> str:
    """
    Tu dong detect GPU bang torch, khong can nguoi dung sua tay.
    Cho phep override qua bien moi truong VOXREAD_DEVICE neu can.
    """
    override = os.environ.get("VOXREAD_DEVICE", "").strip()
    if override:
        return override
    return "cuda:0" if torch.cuda.is_available() else "cpu:0"


DEVICE = detect_device()
print(f"[VoxRead] Dang dung thiet bi: {DEVICE}")

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
last_init_error: str | None = None


def reload_model():
    """
    Quet lai thu muc model/ va khoi tao lai RVCInference.
    Tra ve True neu load duoc model, False neu khong co model hoac gap loi.
    """
    global MODEL_PATH, INDEX_PATH, rvc, last_init_error
    MODEL_PATH, INDEX_PATH = discover_model_paths(BASE_DIR)
    if MODEL_PATH and os.path.isfile(MODEL_PATH):
        try:
            print(f"Dang tai model RVC tu: {MODEL_PATH} ... (lan dau se tu tai them hubert_base.pt + rmvpe.pt, ~200-300MB)")
            new_rvc = RVCInference(
                device=DEVICE,
                model_path=MODEL_PATH,
                index_path=INDEX_PATH,
                version="v2",
            )
            new_rvc.set_params(**RVC_PARAMS)
            rvc = new_rvc
            last_init_error = None
            print(f"Model san sang ({os.path.basename(MODEL_PATH)}). Server dang chay tai http://localhost:{PORT}  (giu cua so nay mo)")
            return True
        except Exception as e:
            rvc = None
            last_init_error = f"Lỗi khởi tạo model RVC ({os.path.basename(MODEL_PATH)}): {str(e)}"
            print(f"[VoxRead] {last_init_error}")
            return False
    else:
        rvc = None
        last_init_error = "Chưa có model giọng RVC (.pth) trong thư mục python-backend/model."
        print("[VoxRead] Canh bao: Chua co model giong RVC (.pth) trong thu muc python-backend/model/, tinh nang RVC se khong kha dung cho toi khi ban them model.")
        return False


# Khoi tao model luc bat dau
reload_model()



async def _synthesize_base(text: str, out_path: str):
    """Goi Edge-TTS de tao giong doc nen. Luu y: Edge-TTS luon tra ve MP3
    (audio-24khz-48kbitrate-mono-mp3) du duoi file la gi, nen ta dat ten
    file dung la .mp3 cho ro rang; RVC (qua PyAV) tu doc duoc dinh dang nay."""
    await edge_tts.Communicate(text, BASE_VOICE).save(out_path)


def _run_rvc_inference(base_path: str, out_path: str):
    """Chay RVC inference truc tiep qua rvc.vc.vc_single thay vi rvc.infer_file.

    rvc-python==0.1.5 co bug: khi vc_single loi, no tra ve tuple (chuoi_loi, (None, None))
    thay vi raise exception. infer_file khong check ma ghi thang vao wavfile.write(),
    gay ra loi kho hieu "'tuple' object has no attribute 'dtype'" — che mat loi that su.
    Ham nay bat dung tuple va raise RuntimeError voi noi dung loi that su.
    """
    if not rvc.current_model:
        raise ValueError("Chưa tải model RVC.")

    model_info = rvc.models[rvc.current_model]
    file_index = model_info.get("index", "")

    result = rvc.vc.vc_single(
        sid=0,
        input_audio_path=base_path,
        f0_up_key=rvc.f0up_key,
        f0_method=rvc.f0method,
        file_index=file_index,
        index_rate=rvc.index_rate,
        filter_radius=rvc.filter_radius,
        resample_sr=rvc.resample_sr,
        rms_mix_rate=rvc.rms_mix_rate,
        protect=rvc.protect,
        f0_file="",
        file_index2="",
    )

    if isinstance(result, tuple):
        error_detail = result[0] if len(result) > 0 and result[0] else "Lỗi không xác định từ pipeline RVC"
        raise RuntimeError(f"Lỗi pipeline RVC: {error_detail}")

    wavfile.write(out_path, rvc.vc.tgt_sr, result)
    return out_path


@app.route("/speak", methods=["POST", "OPTIONS"])
def speak():
    if request.method == "OPTIONS":
        return Response(status=204)

    if rvc is None:
        error_msg = last_init_error or "Chưa có model giọng RVC (.pth) trong thư mục python-backend/model/. Vui lòng copy file .pth (và .index nếu có) vào thư mục python-backend/model/ rồi restart server."
        return jsonify({
            "error": error_msg
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
        t0 = time.time()
        asyncio.run(_synthesize_base(text, base_path))
        t1 = time.time()

        with rvc_lock:
            _run_rvc_inference(base_path, out_path)
        t2 = time.time()

        print(f"[VoxRead][Timing] Edge-TTS: {t1-t0:.2f}s | RVC inference: {t2-t1:.2f}s | "
              f"Text length: {len(text)} ky tu")

        with open(out_path, "rb") as f:
            wav_bytes = f.read()

        return Response(wav_bytes, mimetype="audio/wav")

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Đã xảy ra lỗi khi tổng hợp giọng nói: {str(e)}"}), 500

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
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    return resp


@app.route("/health", methods=["GET"])
def health():
    model_dir = os.path.join(BASE_DIR, "model")
    model_loaded = rvc is not None and getattr(rvc, "current_model", None) is not None
    if model_loaded:
        return jsonify({
            "ok": True,
            "model_loaded": True,
            "model_name": os.path.basename(MODEL_PATH) if MODEL_PATH else None,
            "index_name": os.path.basename(INDEX_PATH) if INDEX_PATH else None,
            "model_dir": model_dir,
            "device": DEVICE,
        })
    reason = "model_init_failed" if (MODEL_PATH and os.path.isfile(MODEL_PATH)) else "model_missing"
    return jsonify({
        "ok": False,
        "reason": reason,
        "model_loaded": False,
        "model_dir": model_dir,
        "error": last_init_error or "Chưa có file model (.pth) trong thư mục python-backend/model.",
        "device": DEVICE,
    })


@app.route("/model/list", methods=["GET"])
def model_list():
    model_dir = os.path.join(BASE_DIR, "model")
    os.makedirs(model_dir, exist_ok=True)
    pth_files = sorted([f for f in os.listdir(model_dir) if f.endswith(".pth") and not f.startswith(".")])
    index_files = sorted([f for f in os.listdir(model_dir) if f.endswith(".index") and not f.startswith(".")])
    return jsonify({
        "ok": True,
        "model_dir": model_dir,
        "active_model": os.path.basename(MODEL_PATH) if MODEL_PATH else None,
        "active_index": os.path.basename(INDEX_PATH) if INDEX_PATH else None,
        "pth_files": pth_files,
        "index_files": index_files,
    })


@app.route("/model/reload", methods=["POST"])
def model_reload():
    with rvc_lock:
        success = reload_model()
    model_dir = os.path.join(BASE_DIR, "model")
    if success and rvc is not None:
        return jsonify({
            "ok": True,
            "model_loaded": True,
            "model_name": os.path.basename(MODEL_PATH) if MODEL_PATH else None,
            "index_name": os.path.basename(INDEX_PATH) if INDEX_PATH else None,
            "model_dir": model_dir,
            "device": DEVICE,
        })
    reason = "model_init_failed" if (MODEL_PATH and os.path.isfile(MODEL_PATH)) else "model_missing"
    return jsonify({
        "ok": False,
        "reason": reason,
        "model_loaded": False,
        "model_dir": model_dir,
        "error": last_init_error or "Chưa có file model (.pth) trong thư mục python-backend/model.",
        "device": DEVICE,
    })


@app.route("/model/create-folder", methods=["POST"])
def model_create_folder():
    model_dir = os.path.join(BASE_DIR, "model")
    os.makedirs(model_dir, exist_ok=True)
    return jsonify({
        "ok": True,
        "model_dir": model_dir,
    })


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=PORT, threaded=True)


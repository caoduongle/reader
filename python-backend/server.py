"""
Server TTS cho ung dung VoxRead (Electron desktop).

Pipeline: text --(VieNeu-TTS)--> giong doc san / giong da nhan ban --> WAV

App VoxRead Electron/renderer goi toi:
    POST http://localhost:8008/speak
    body: { "text": "...", "voice": "Adam" }   (voice la tuy chon)
    -> tra ve RAW BYTES cua file WAV (audio/wav)

Ke tu feature 048-desktop-tts-migration: da bo hoan toan pipeline RVC
(rvc-python, fairseq, PyTorch bat buoc, quy trinh train qua Google Colab).
Microsoft Edge TTS da chuyen sang xu ly o server.js (Node) - server nay
KHONG con phuc vu Edge TTS nua. Xem specs/048-desktop-tts-migration/.

Nhan ban giong (voice cloning) gio la "instant" - chi can 1 clip tham chieu
3-8 giay, khong can train model rieng nhu RVC truoc day.
"""

import json
import os
import tempfile
import threading
import traceback

from flask import Flask, request, Response, jsonify
from vieneu import Vieneu

# Thu muc chua chinh file server.py nay - dung lam goc cho moi duong dan ben duoi,
# de du chay tu dau (terminal o thu muc khac, Task Scheduler, Startup...) van dung.
# Giu nguyen quy uoc BASE_DIR-relative nhu ban RVC cu de tuong thich voi cach
# Electron resolve duong dan packaged/dev (xem electron/main.ts getBackendPaths()).
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Noi luu giong nguoi dung da nhan ban - thay the python-backend/model/*.pth/*.index cu.
VOICES_DIR = os.path.join(BASE_DIR, "voices")
USER_VOICES_JSON = os.path.join(VOICES_DIR, "user_voices.json")
os.makedirs(VOICES_DIR, exist_ok=True)

PORT = 8008

# Gioi han do dai van ban - giu nguyen gia tri cua ban RVC cu de khong doi hanh vi UX.
MAX_TEXT_LENGTH = 10000

# Do dai clip tham chieu de nhan ban giong. VieNeu khuyen nghi 3-8s; cho phep
# roi rai hon mot chut nhung van chan file qua ngan (nhieu, khong du thong tin
# giong noi) hoac qua dai (nguoi dung nham, ton thoi gian xu ly).
MIN_REF_CLIP_SECONDS = 2.0
MAX_REF_CLIP_SECONDS = 25.0

ALLOWED_CLIP_EXTENSIONS = (".wav", ".mp3", ".m4a")

app = Flask(__name__)

# vieneu khong cong bo cam ket thread-safety cho infer()/add_voice() khi goi dong
# thoi. Giu 1 khoa toan cuc tuong tu ban RVC cu de an toan, dac biet vi kien truc
# prefetch N+1/N+2 phia client (useTTS.ts) co the ban 2 request /speak song song.
_vieneu_lock = threading.Lock()
_vieneu = None
_vieneu_init_error: str | None = None


def get_vieneu():
    """Khoi tao VieNeu-TTS lazy (chi khi co request dau tien can toi).

    Lan dau se tai model tu Hugging Face Hub (can Internet), nhung dependency
    mac dinh khong can PyTorch (chay ONNX Runtime tren CPU) - nhe hon nhieu so
    voi RVC. Neu that bai (vd mat mang), loi duoc ghi vao _vieneu_init_error de
    /health va /speak tra ve thong bao ro rang thay vi crash server hoac treo im.
    """
    global _vieneu, _vieneu_init_error
    if _vieneu is not None:
        return _vieneu
    with _vieneu_lock:
        if _vieneu is not None:  # double-checked locking
            return _vieneu
        print("[VoxRead] Dang khoi tao VieNeu-TTS (lan dau co the mat vai phut de tai model)...")
        try:
            tts = Vieneu()  # mode="v3turbo" mac dinh: CPU/ONNX torch-free; tu dung GPU/PyTorch neu co
            _load_user_voices(tts)
            _vieneu = tts
            _vieneu_init_error = None
            print(f"[VoxRead] VieNeu-TTS san sang. Server dang chay tai http://localhost:{PORT}")
            return _vieneu
        except Exception as e:
            _vieneu_init_error = str(e)
            print(f"[VoxRead][Loi] Khong the khoi tao VieNeu-TTS: {e}")
            traceback.print_exc()
            raise


def _friendly_init_error() -> str:
    """Dich loi ky thuat (thuong la huggingface_hub khi mat mang) sang thong bao
    de hieu cho nguoi dung cuoi."""
    err = _vieneu_init_error or ""
    network_markers = ("HTTPError", "Hub", "Connection", "internet", "Internet", "Forbidden", "resolve")
    if any(marker in err for marker in network_markers):
        return "Khong the tai model VieNeu-TTS (can Internet cho lan dau tien). Vui long kiem tra ket noi roi thu lai."
    return err or "VieNeu-TTS chua san sang."


# ============================================================
#  Luu tru giong da nhan ban (thay the model/*.pth + *.index cua RVC)
#
#  Khac voi rvc-python (bat buoc train qua Colab, xem docs/rvc-voice-setup.md
#  cu), VieNeu nhan ban tuc thi tu 1 clip tham chieu ngan qua tts.add_voice(),
#  khong can train. Ham tts.save_voices() co san trong thu vien ghi de len file
#  preset GOC nam trong site-packages (se mat khi nang cap thu vien - xem canh
#  bao ngay trong docstring cua apps/user_voices.py trong chinh package vieneu).
#  Vi vay ta tu luu 1 file JSON rieng ben ngoai (cung chien luoc voi
#  apps/user_voices.py) roi nap chong len tts._preset_voices moi khi khoi dong.
# ============================================================

def _load_user_voices(tts) -> int:
    """Nap cac giong da nhan ban tu USER_VOICES_JSON vao tts._preset_voices.
    Khong bao gio raise - file hong hoac thieu chi nghia la khong co giong nao
    duoc nap (giong nhu khi chua tung nhan ban giong nao)."""
    if not os.path.isfile(USER_VOICES_JSON):
        return 0
    try:
        with open(USER_VOICES_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"[VoxRead][Canh bao] Khong doc duoc {USER_VOICES_JSON}: {e}")
        return 0

    import numpy as np
    loaded = 0
    for name, v in (data.get("voices") or {}).items():
        emb = v.get("speaker_emb")
        if emb is None:
            continue
        tts._preset_voices[name] = {
            "description": v.get("description", "Giong da nhan ban"),
            "gender": v.get("gender", ""),
            "style": getattr(tts, "default_style", "tu_nhien"),
            "speaker_emb": np.asarray(emb, dtype=np.float32),
            "codes": np.asarray(v["codes"], dtype=np.int64) if v.get("codes") is not None else None,
            "_user_voice": True,
        }
        loaded += 1
    if loaded:
        print(f"[VoxRead] Da nap {loaded} giong nguoi dung tu {USER_VOICES_JSON}")
    return loaded


def _persist_user_voice(tts, name: str) -> None:
    """Ghi 1 giong (vua them qua tts.add_voice) vao USER_VOICES_JSON.
    KHONG dung tts.save_voices() vi ham do ghi de file preset goc trong
    site-packages cua thu vien (xem ghi chu o dau khoi nay)."""
    entry = tts._preset_voices.get(name)
    if entry is None:
        raise ValueError(f"Khong tim thay giong '{name}' de luu.")

    data = {"voices": {}}
    if os.path.isfile(USER_VOICES_JSON):
        try:
            with open(USER_VOICES_JSON, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            data = {"voices": {}}

    emb = entry.get("speaker_emb")
    codes = entry.get("codes")
    data.setdefault("voices", {})[name] = {
        "description": entry.get("description", ""),
        "gender": entry.get("gender", ""),
        "speaker_emb": [round(float(x), 6) for x in emb.reshape(-1)] if emb is not None else None,
        "codes": codes.astype(int).tolist() if codes is not None else None,
    }

    os.makedirs(VOICES_DIR, exist_ok=True)
    tmp_path = USER_VOICES_JSON + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(tmp_path, USER_VOICES_JSON)  # ghi nguyen tu, tranh file hong neu crash giua chung


def _remove_persisted_user_voice(name: str) -> None:
    if not os.path.isfile(USER_VOICES_JSON):
        return
    try:
        with open(USER_VOICES_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
        if name in data.get("voices", {}):
            del data["voices"][name]
            with open(USER_VOICES_JSON, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False)
    except Exception:
        traceback.print_exc()


def list_all_voices(tts) -> list[dict]:
    """Danh sach giong cho UI chon: ca giong dung san lan giong nguoi dung da nhan ban."""
    voices = []
    for name, v in tts._preset_voices.items():
        if not isinstance(v, dict):
            continue
        voices.append({
            "id": name,
            "description": v.get("description", ""),
            "isUserVoice": bool(v.get("_user_voice")),
        })
    return voices


def _get_audio_duration_seconds(path: str) -> float | None:
    """Doc do dai file audio (giay) bang soundfile - da la dependency co san cua
    vieneu nen luon co san trong cung venv, khong can them thu vien moi."""
    try:
        import soundfile as sf
        info = sf.info(path)
        return info.frames / float(info.samplerate)
    except Exception:
        return None  # dinh dang khong doc duoc qua soundfile (vd .m4a tren mot so he thong) - bo qua kiem tra do dai


# ============================================================
#  Routes
# ============================================================

@app.route("/speak", methods=["POST", "OPTIONS"])
def speak():
    if request.method == "OPTIONS":
        return Response(status=204)

    data = request.get_json(force=True, silent=True) or {}
    text = (data.get("text") or "").strip()
    voice = (data.get("voice") or "").strip() or None

    if not text:
        return jsonify({"error": "Thieu 'text' trong request"}), 400
    if len(text) > MAX_TEXT_LENGTH:
        return jsonify({"error": f"Do dai van ban vuot qua gioi han toi da ({MAX_TEXT_LENGTH} ky tu)."}), 400

    try:
        tts = get_vieneu()
    except Exception:
        return jsonify({"error": _friendly_init_error()}), 503

    tmp_dir = tempfile.mkdtemp(prefix="tts_vieneu_")
    out_path = os.path.join(tmp_dir, "out.wav")
    try:
        with _vieneu_lock:
            audio = tts.infer(text, voice=voice) if voice else tts.infer(text)
            tts.save(audio, out_path)

        with open(out_path, "rb") as f:
            wav_bytes = f.read()
        return Response(wav_bytes, mimetype="audio/wav")

    except ValueError as e:
        # vd ten giong khong ton tai trong tts._preset_voices
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": f"Da xay ra loi khi tong hop giong noi: {str(e)}"}), 500
    finally:
        if os.path.exists(out_path):
            os.remove(out_path)
        try:
            os.rmdir(tmp_dir)
        except OSError:
            pass


@app.route("/voices", methods=["GET"])
def list_voices():
    """Danh sach giong hien co (dung san + nguoi dung da nhan ban), cho SettingsModal."""
    try:
        tts = get_vieneu()
    except Exception:
        return jsonify({"ok": False, "error": _friendly_init_error(), "voices": []}), 503
    return jsonify({"ok": True, "voices": list_all_voices(tts)})


@app.route("/voices/add", methods=["POST", "OPTIONS"])
def add_voice():
    """Nhan ban giong tuc thi tu 1 clip tham chieu 3-8 giay - KHONG can train.
    Thay the hoan toan quy trinh train RVC qua Google Colab (docs/rvc-voice-setup.md cu)."""
    if request.method == "OPTIONS":
        return Response(status=204)

    name = (request.form.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Hay dat ten cho giong."}), 400
    if len(name) > 40:
        return jsonify({"error": "Ten giong toi da 40 ky tu."}), 400
    if "—" in name or "/" in name or "\\" in name:
        return jsonify({"error": "Ten giong khong duoc chua ky tu / \\ —."}), 400

    audio_file = request.files.get("audio")
    if audio_file is None or not audio_file.filename:
        return jsonify({"error": "Hay tai len file audio mau (3-8 giay)."}), 400

    suffix = os.path.splitext(audio_file.filename)[1].lower()
    if suffix not in ALLOWED_CLIP_EXTENSIONS:
        return jsonify({"error": f"Chi ho tro file {', '.join(ALLOWED_CLIP_EXTENSIONS)}."}), 400

    try:
        tts = get_vieneu()
    except Exception:
        return jsonify({"error": _friendly_init_error()}), 503

    existing = tts._preset_voices.get(name)
    if existing is not None and not existing.get("_user_voice"):
        return jsonify({"error": f"'{name}' la giong dung san cua VieNeu, hay chon ten khac."}), 400

    tmp_dir = tempfile.mkdtemp(prefix="voice_clone_")
    clip_path = os.path.join(tmp_dir, f"ref{suffix}")
    audio_file.save(clip_path)

    try:
        duration = _get_audio_duration_seconds(clip_path)
        if duration is not None and duration < MIN_REF_CLIP_SECONDS:
            return jsonify({"error": f"Clip qua ngan ({duration:.1f}s). Can toi thieu {MIN_REF_CLIP_SECONDS:.0f} giay."}), 400
        if duration is not None and duration > MAX_REF_CLIP_SECONDS:
            return jsonify({"error": f"Clip qua dai ({duration:.1f}s). Toi da {MAX_REF_CLIP_SECONDS:.0f} giay."}), 400

        with _vieneu_lock:
            tts.add_voice(name, clip_path, denoise=True, description="Giong da nhan ban")
            tts._preset_voices[name]["_user_voice"] = True
            _persist_user_voice(tts, name)

        return jsonify({"success": True, "voiceName": name})

    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "error": f"Khong the nhan ban giong: {str(e)}"}), 500
    finally:
        if os.path.exists(clip_path):
            os.remove(clip_path)
        try:
            os.rmdir(tmp_dir)
        except OSError:
            pass


@app.route("/voices/<name>", methods=["DELETE", "OPTIONS"])
def delete_voice(name: str):
    """Xoa 1 giong da nhan ban. Khong the xoa giong dung san cua VieNeu."""
    if request.method == "OPTIONS":
        return Response(status=204)

    try:
        tts = get_vieneu()
    except Exception:
        return jsonify({"error": _friendly_init_error()}), 503

    entry = tts._preset_voices.get(name)
    if entry is None or not entry.get("_user_voice"):
        return jsonify({"error": "Chi xoa duoc giong do ban tu nhan ban."}), 400

    with _vieneu_lock:
        tts.remove_voice(name)
        _remove_persisted_user_voice(name)

    return jsonify({"success": True})


@app.after_request
def _add_cors_headers(resp):
    origin = request.headers.get("Origin")
    allowed_origins = {"http://localhost:3000", "http://127.0.0.1:3000", "null"}
    if origin and origin in allowed_origins:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, DELETE, OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    return resp


@app.route("/health", methods=["GET"])
def health():
    """Bao cao trang thai server. Khac voi ban RVC cu (bat buoc co model.pth
    truoc khi dung duoc), VieNeu luon co san giong dung san ngay khi model tai
    xong lan dau - vi vay 'chua tung goi /speak lan nao' la trang thai BINH
    THUONG (ok=True, vieneu_ready=False), khac voi 'da thu tai nhung that bai'
    (ok=False, kem error ro rang)."""
    if _vieneu is not None:
        return jsonify({"ok": True, "vieneu_ready": True, "voices_dir": VOICES_DIR})
    if _vieneu_init_error is not None:
        return jsonify({
            "ok": False,
            "vieneu_ready": False,
            "error": _friendly_init_error(),
            "voices_dir": VOICES_DIR,
        })
    return jsonify({"ok": True, "vieneu_ready": False, "voices_dir": VOICES_DIR})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=PORT, threaded=True)

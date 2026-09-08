"""Tests cho python-backend/server.py sau khi bo RVC (feature 048-desktop-tts-migration).

Khong mock viec import `vieneu` (khac voi ban RVC cu can mock `rvc_python` vi thu
vien do can binary C++ bien dich) - `pip install vieneu` la mot dependency binh
thuong, import duoc ma khong can mang. Chi mock DOI TUONG tts (ket qua cua
get_vieneu()) de test khong thuc su tai model tu Hugging Face Hub hay chay
inference that.
"""

import io
import json
import os
import sys
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import server  # noqa: E402


def _make_mock_tts(preset_voices=None):
    """Tao 1 doi tuong gia lap the cho Vieneu(), voi cac thuoc tinh/method ma
    server.py thuc su dung: infer, save, add_voice, remove_voice, _preset_voices,
    default_style."""
    tts = MagicMock()
    tts._preset_voices = preset_voices if preset_voices is not None else {
        "Adam": {"description": "Giong nam mien Bac", "gender": "male"},
    }
    tts.default_style = "tu_nhien"
    tts.infer.return_value = np.zeros(2400, dtype=np.float32)  # 0.1s @ 24kHz gia lap
    tts.save.side_effect = lambda audio, path: open(path, "wb").write(b"RIFF....WAVEfake")
    return tts


@pytest.fixture
def client():
    server.app.config["TESTING"] = True
    with server.app.test_client() as c:
        yield c


@pytest.fixture(autouse=True)
def reset_module_state():
    """Cach ly moi test khoi state global (_vieneu, _vieneu_init_error) va don
    USER_VOICES_JSON test co the tao ra."""
    original_vieneu = server._vieneu
    original_error = server._vieneu_init_error
    yield
    server._vieneu = original_vieneu
    server._vieneu_init_error = original_error
    if os.path.exists(server.USER_VOICES_JSON):
        os.remove(server.USER_VOICES_JSON)


@pytest.fixture
def mock_ready_tts():
    """Gia lap truong hop VieNeu-TTS da khoi tao thanh cong."""
    tts = _make_mock_tts()
    server._vieneu = tts
    server._vieneu_init_error = None
    return tts


# ============================================================
#  /health
# ============================================================

def test_health_when_never_attempted_is_ok_but_not_ready(client):
    """Truoc khi goi /speak lan nao, day la trang thai BINH THUONG (khac RVC cu
    - VieNeu khong bat buoc nguoi dung phai co san model file truoc)."""
    server._vieneu = None
    server._vieneu_init_error = None
    response = client.get("/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["ok"] is True
    assert data["vieneu_ready"] is False
    assert "error" not in data


def test_health_when_ready(client, mock_ready_tts):
    response = client.get("/health")
    data = response.get_json()
    assert data["ok"] is True
    assert data["vieneu_ready"] is True


def test_health_when_init_failed_reports_friendly_network_error(client):
    server._vieneu = None
    server._vieneu_init_error = (
        "huggingface_hub.errors.LocalEntryNotFoundError: check your internet connection"
    )
    response = client.get("/health")
    data = response.get_json()
    assert data["ok"] is False
    assert data["vieneu_ready"] is False
    assert "Internet" in data["error"]


# ============================================================
#  POST /speak
# ============================================================

def test_speak_missing_text_returns_400(client):
    response = client.post("/speak", json={"text": ""})
    assert response.status_code == 400
    assert "text" in response.get_json()["error"].lower()


def test_speak_text_too_long_returns_400(client):
    response = client.post("/speak", json={"text": "a" * (server.MAX_TEXT_LENGTH + 1)})
    assert response.status_code == 400


def test_speak_when_model_not_ready_returns_503(client):
    with patch.object(server, "get_vieneu", side_effect=RuntimeError("network down")):
        response = client.post("/speak", json={"text": "Xin chao"})
        assert response.status_code == 503
        assert "error" in response.get_json()


def test_speak_success_calls_infer_and_returns_wav_bytes(client, mock_ready_tts):
    with patch.object(server, "get_vieneu", return_value=mock_ready_tts):
        response = client.post("/speak", json={"text": "Xin chao VoxRead", "voice": "Adam"})
        assert response.status_code == 200
        assert response.mimetype == "audio/wav"
        assert len(response.data) > 0
        mock_ready_tts.infer.assert_called_once()
        assert mock_ready_tts.infer.call_args.kwargs.get("voice") == "Adam"


def test_speak_without_voice_omits_voice_kwarg(client, mock_ready_tts):
    """Khi khong chon giong cu the, khong ep 'voice' de VieNeu tu dung default_voice."""
    with patch.object(server, "get_vieneu", return_value=mock_ready_tts):
        client.post("/speak", json={"text": "Xin chao"})
        _, kwargs = mock_ready_tts.infer.call_args
        assert "voice" not in kwargs


def test_speak_invalid_voice_name_maps_value_error_to_400(client, mock_ready_tts):
    mock_ready_tts.infer.side_effect = ValueError("Voice 'khong-ton-tai' not found.")
    with patch.object(server, "get_vieneu", return_value=mock_ready_tts):
        response = client.post("/speak", json={"text": "Xin chao", "voice": "khong-ton-tai"})
        assert response.status_code == 400


# ============================================================
#  GET /voices
# ============================================================

def test_list_voices_when_not_ready_returns_503(client):
    with patch.object(server, "get_vieneu", side_effect=RuntimeError("network down")):
        response = client.get("/voices")
        assert response.status_code == 503
        assert response.get_json()["voices"] == []


def test_list_voices_success(client, mock_ready_tts):
    mock_ready_tts._preset_voices = {
        "Adam": {"description": "Giong nam", "_user_voice": False},
        "GiongCuaToi": {"description": "Giong da nhan ban", "_user_voice": True},
    }
    with patch.object(server, "get_vieneu", return_value=mock_ready_tts):
        response = client.get("/voices")
        data = response.get_json()
        assert data["ok"] is True
        ids = {v["id"] for v in data["voices"]}
        assert ids == {"Adam", "GiongCuaToi"}
        user_flags = {v["id"]: v["isUserVoice"] for v in data["voices"]}
        assert user_flags["Adam"] is False
        assert user_flags["GiongCuaToi"] is True


# ============================================================
#  POST /voices/add  (thay the hoan toan viec train RVC qua Colab)
# ============================================================

def _wav_bytes(seconds: float, sr: int = 16000) -> bytes:
    import soundfile as sf
    buf = io.BytesIO()
    sf.write(buf, np.zeros(int(seconds * sr), dtype=np.float32), sr, format="WAV")
    return buf.getvalue()


def test_add_voice_missing_name_returns_400(client):
    response = client.post(
        "/voices/add",
        data={"audio": (io.BytesIO(_wav_bytes(5)), "clip.wav")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 400
    assert "tên" in response.get_json()["error"].lower() or "ten" in response.get_json()["error"].lower()


def test_add_voice_missing_audio_returns_400(client):
    response = client.post("/voices/add", data={"name": "GiongCuaToi"}, content_type="multipart/form-data")
    assert response.status_code == 400


def test_add_voice_bad_extension_returns_400(client):
    response = client.post(
        "/voices/add",
        data={"name": "GiongCuaToi", "audio": (io.BytesIO(b"not audio"), "clip.txt")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 400


def test_add_voice_clip_too_short_returns_400(client, mock_ready_tts):
    with patch.object(server, "get_vieneu", return_value=mock_ready_tts):
        response = client.post(
            "/voices/add",
            data={"name": "GiongCuaToi", "audio": (io.BytesIO(_wav_bytes(1.0)), "clip.wav")},
            content_type="multipart/form-data",
        )
        assert response.status_code == 400
        assert "ngắn" in response.get_json()["error"] or "ngan" in response.get_json()["error"]
        mock_ready_tts.add_voice.assert_not_called()


def test_add_voice_clip_too_long_returns_400(client, mock_ready_tts):
    with patch.object(server, "get_vieneu", return_value=mock_ready_tts):
        response = client.post(
            "/voices/add",
            data={"name": "GiongCuaToi", "audio": (io.BytesIO(_wav_bytes(server.MAX_REF_CLIP_SECONDS + 5)), "clip.wav")},
            content_type="multipart/form-data",
        )
        assert response.status_code == 400
        mock_ready_tts.add_voice.assert_not_called()


def test_add_voice_name_collides_with_builtin_preset_returns_400(client, mock_ready_tts):
    mock_ready_tts._preset_voices = {"Adam": {"description": "Giong dung san"}}  # khong co _user_voice
    with patch.object(server, "get_vieneu", return_value=mock_ready_tts):
        response = client.post(
            "/voices/add",
            data={"name": "Adam", "audio": (io.BytesIO(_wav_bytes(5)), "clip.wav")},
            content_type="multipart/form-data",
        )
        assert response.status_code == 400
        mock_ready_tts.add_voice.assert_not_called()


def test_add_voice_success_calls_add_voice_and_persists(client, mock_ready_tts, tmp_path):
    mock_ready_tts._preset_voices = {}

    def fake_add_voice(name, ref_audio, **kwargs):
        mock_ready_tts._preset_voices[name] = {
            "description": kwargs.get("description", ""),
            "speaker_emb": np.zeros(192, dtype=np.float32),
            "codes": np.zeros(10, dtype=np.int64),
        }
        return name

    mock_ready_tts.add_voice.side_effect = fake_add_voice

    with patch.object(server, "get_vieneu", return_value=mock_ready_tts), \
         patch.object(server, "VOICES_DIR", str(tmp_path)), \
         patch.object(server, "USER_VOICES_JSON", str(tmp_path / "user_voices.json")):
        response = client.post(
            "/voices/add",
            data={"name": "GiongCuaToi", "audio": (io.BytesIO(_wav_bytes(5)), "clip.wav")},
            content_type="multipart/form-data",
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["voiceName"] == "GiongCuaToi"
        mock_ready_tts.add_voice.assert_called_once()
        assert mock_ready_tts._preset_voices["GiongCuaToi"]["_user_voice"] is True

        # Xac nhan da ghi ra file JSON rieng (khong dung tts.save_voices() cua thu vien)
        assert (tmp_path / "user_voices.json").exists()
        saved = json.loads((tmp_path / "user_voices.json").read_text(encoding="utf-8"))
        assert "GiongCuaToi" in saved["voices"]
        mock_ready_tts.save_voices.assert_not_called()


# ============================================================
#  DELETE /voices/<name>
# ============================================================

def test_delete_voice_not_a_user_voice_returns_400(client, mock_ready_tts):
    mock_ready_tts._preset_voices = {"Adam": {"description": "Giong dung san"}}
    with patch.object(server, "get_vieneu", return_value=mock_ready_tts):
        response = client.delete("/voices/Adam")
        assert response.status_code == 400
        mock_ready_tts.remove_voice.assert_not_called()


def test_delete_voice_success(client, mock_ready_tts, tmp_path):
    mock_ready_tts._preset_voices = {"GiongCuaToi": {"_user_voice": True}}
    voices_json = tmp_path / "user_voices.json"
    voices_json.write_text(json.dumps({"voices": {"GiongCuaToi": {"description": ""}}}), encoding="utf-8")

    with patch.object(server, "get_vieneu", return_value=mock_ready_tts), \
         patch.object(server, "USER_VOICES_JSON", str(voices_json)):
        response = client.delete("/voices/GiongCuaToi")
        assert response.status_code == 200
        assert response.get_json()["success"] is True
        mock_ready_tts.remove_voice.assert_called_once_with("GiongCuaToi")
        remaining = json.loads(voices_json.read_text(encoding="utf-8"))
        assert "GiongCuaToi" not in remaining["voices"]

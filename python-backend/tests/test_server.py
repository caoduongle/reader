import os
import sys
from unittest.mock import MagicMock, patch
import numpy as np
import pytest

# Ensure rvc_python is mocked if compiled C++ binaries are not present
if "rvc_python" not in sys.modules:
    mock_pkg = MagicMock()
    mock_infer = MagicMock()
    mock_pkg.infer = mock_infer
    sys.modules["rvc_python"] = mock_pkg
    sys.modules["rvc_python.infer"] = mock_infer

# Add python-backend directory to sys.path
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import server  # noqa: E402


@pytest.fixture
def client():
    server.app.config["TESTING"] = True
    with server.app.test_client() as client:
        yield client


@pytest.fixture(autouse=True)
def ensure_mock_rvc_when_empty():
    """Ensure tests that require an active rvc instance have one even in CI."""
    original_rvc = server.rvc
    if server.rvc is None:
        mock_rvc = MagicMock()
        mock_rvc.current_model = "mock_model"
        mock_rvc.models = {"mock_model": {"index": ""}}
        mock_rvc.vc.tgt_sr = 40000
        mock_rvc.f0up_key = 0
        mock_rvc.f0method = "rmvpe"
        mock_rvc.index_rate = 0.75
        mock_rvc.filter_radius = 3
        mock_rvc.resample_sr = 0
        mock_rvc.rms_mix_rate = 0.25
        mock_rvc.protect = 0.33
        server.rvc = mock_rvc
    yield
    server.rvc = original_rvc


def test_health_endpoint_returns_ok(client):
    """Verify GET /health returns HTTP 200 with status, model_loaded=True, and model_dir."""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.get_json()
    assert data is not None
    assert data.get("ok") is True
    assert data.get("model_loaded") is True
    assert "model_dir" in data


def test_health_endpoint_when_no_model(client):
    """Verify GET /health reports ok=False, reason=model_missing, model_loaded=False when rvc is None."""
    with patch.object(server, "rvc", None), patch.object(server, "MODEL_PATH", None):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.get_json()
        assert data["ok"] is False
        assert data["reason"] == "model_missing"
        assert data["model_loaded"] is False
        assert "model_dir" in data
        assert "error" in data
        assert "device" in data


def test_health_endpoint_when_init_failed(client, tmp_path):
    """Verify GET /health reports reason=model_init_failed and error details when model file exists but init failed."""
    dummy_model = tmp_path / "corrupt.pth"
    dummy_model.touch()
    with patch.object(server, "rvc", None), \
         patch.object(server, "MODEL_PATH", str(dummy_model)), \
         patch.object(server, "last_init_error", "Lỗi khởi tạo model RVC: invalid checkpoint"):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.get_json()
        assert data["ok"] is False
        assert data["reason"] == "model_init_failed"
        assert data["model_loaded"] is False
        assert "invalid checkpoint" in data["error"]


def test_detect_device_behavior():
    """Verify detect_device chooses cuda:0 if available, cpu:0 if not, and respects VOXREAD_DEVICE override."""
    with patch.dict(os.environ, {"VOXREAD_DEVICE": "cpu:0"}):
        assert server.detect_device() == "cpu:0"

    with patch.dict(os.environ, {"VOXREAD_DEVICE": "cuda:1"}):
        assert server.detect_device() == "cuda:1"

    with patch.dict(os.environ, {"VOXREAD_DEVICE": ""}):
        with patch("torch.cuda.is_available", return_value=True):
            assert server.detect_device() == "cuda:0"
        with patch("torch.cuda.is_available", return_value=False):
            assert server.detect_device() == "cpu:0"




def test_speak_endpoint_rejects_missing_text(client):
    """Verify POST /speak returns HTTP 400 when body is empty or lacks text."""
    response = client.post("/speak", json={})
    assert response.status_code == 400

    data = response.get_json()
    assert data is not None
    assert "error" in data
    assert "Thieu 'text'" in data["error"]


def test_speak_endpoint_rejects_whitespace_text(client):
    """Verify POST /speak returns HTTP 400 when text consists solely of whitespace."""
    response = client.post("/speak", json={"text": "   \n\t  "})
    assert response.status_code == 400

    data = response.get_json()
    assert data is not None
    assert "error" in data


def test_speak_without_model_returns_503(client):
    """Verify POST /speak returns HTTP 503 when no RVC model is loaded."""
    with patch.object(server, "rvc", None), patch.object(server, "last_init_error", None):
        response = client.post("/speak", json={"text": "Xin chào thế giới."})
        assert response.status_code == 503

        data = response.get_json()
        assert data is not None
        assert "error" in data
        assert "python-backend/model/" in data["error"]


def test_speak_without_model_custom_error(client):
    """Verify POST /speak returns custom initialization error in HTTP 503 response."""
    custom_err = "Lỗi khởi tạo model RVC: corrupt weights"
    with patch.object(server, "rvc", None), patch.object(server, "last_init_error", custom_err):
        response = client.post("/speak", json={"text": "Xin chào thế giới."})
        assert response.status_code == 503

        data = response.get_json()
        assert data is not None
        assert data.get("error") == custom_err



def test_speak_options_preflight_authorized_origin(client):
    """Verify OPTIONS /speak with whitelisted Origin returns HTTP 204 and echoes Origin."""
    response = client.options("/speak", headers={"Origin": "http://localhost:3000"})
    assert response.status_code == 204
    assert response.headers.get("Access-Control-Allow-Origin") == "http://localhost:3000"
    assert "POST" in response.headers.get("Access-Control-Allow-Methods", "")


def test_speak_options_preflight_unauthorized_origin(client):
    """Verify OPTIONS /speak with untrusted Origin returns HTTP 204 without CORS headers."""
    response = client.options("/speak", headers={"Origin": "https://trang-la.evil"})
    assert response.status_code == 204
    assert response.headers.get("Access-Control-Allow-Origin") is None


def test_speak_options_preflight_chrome_extension_rejected(client):
    """Verify OPTIONS /speak rejects chrome-extension:// origins (no CORS header returned)."""
    response = client.options("/speak", headers={"Origin": "chrome-extension://abcdefghijklmnop"})
    assert response.status_code == 204
    assert response.headers.get("Access-Control-Allow-Origin") is None


def test_speak_options_preflight_no_origin(client):
    """Verify OPTIONS /speak with no Origin header returns HTTP 204 without CORS headers."""
    response = client.options("/speak")
    assert response.status_code == 204
    assert response.headers.get("Access-Control-Allow-Origin") is None


def test_speak_valid_request_returns_audio_wav(client):
    """Verify POST /speak returns HTTP 200 with audio/wav mimetype on successful synthesis."""
    dummy_audio_array = np.zeros(16000, dtype=np.int16)

    async def mock_synth(text, out_path):
        with open(out_path, "wb") as f:
            f.write(b"dummy_base_audio")

    if not hasattr(server.rvc, "models") or not isinstance(server.rvc.models, dict):
        server.rvc.models = {server.rvc.current_model: {"index": ""}}
    if not hasattr(server.rvc.vc, "tgt_sr") or not isinstance(server.rvc.vc.tgt_sr, int):
        server.rvc.vc.tgt_sr = 40000

    with patch.object(server, "_synthesize_base", side_effect=mock_synth), \
         patch.object(server.rvc.vc, "vc_single", return_value=dummy_audio_array):
        response = client.post("/speak", json={"text": "Hôm nay trời rất đẹp."})
        assert response.status_code == 200
        assert response.mimetype == "audio/wav"
        assert response.data[:4] == b"RIFF"


def test_speak_rvc_pipeline_error_returns_500_with_message(client):
    """Verify POST /speak returns HTTP 500 with meaningful error when vc_single returns error tuple."""
    async def mock_synth(text, out_path):
        with open(out_path, "wb") as f:
            f.write(b"dummy_base_audio")

    if not hasattr(server.rvc, "models") or not isinstance(server.rvc.models, dict):
        server.rvc.models = {server.rvc.current_model: {"index": ""}}

    error_tuple = ("Model architecture mismatch: expected 256 dimensions but got 768", (None, None))

    with patch.object(server, "_synthesize_base", side_effect=mock_synth), \
         patch.object(server.rvc.vc, "vc_single", return_value=error_tuple):
        response = client.post("/speak", json={"text": "Hôm nay trời rất đẹp."})
        assert response.status_code == 500
        data = response.get_json()
        assert data is not None
        assert "Lỗi pipeline RVC: Model architecture mismatch" in data.get("error", "")
        assert "has no attribute 'dtype'" not in data.get("error", "")


def test_run_rvc_inference_raises_on_tuple(tmp_path):
    """Verify _run_rvc_inference raises RuntimeError with actual message when vc_single returns tuple."""
    base_file = tmp_path / "base.mp3"
    base_file.write_bytes(b"dummy")
    out_file = tmp_path / "out.wav"

    if not hasattr(server.rvc, "models") or not isinstance(server.rvc.models, dict):
        server.rvc.models = {server.rvc.current_model: {"index": ""}}

    error_tuple = ("Index file not found or corrupted", (None, None))

    with patch.object(server.rvc.vc, "vc_single", return_value=error_tuple):
        with pytest.raises(RuntimeError) as exc_info:
            server._run_rvc_inference(str(base_file), str(out_file))
        assert "Lỗi pipeline RVC: Index file not found or corrupted" in str(exc_info.value)


def test_run_rvc_inference_raises_on_empty_tuple(tmp_path):
    """Verify _run_rvc_inference raises RuntimeError with fallback message when tuple has no detail."""
    base_file = tmp_path / "base.mp3"
    base_file.write_bytes(b"dummy")
    out_file = tmp_path / "out.wav"

    if not hasattr(server.rvc, "models") or not isinstance(server.rvc.models, dict):
        server.rvc.models = {server.rvc.current_model: {"index": ""}}

    with patch.object(server.rvc.vc, "vc_single", return_value=()):
        with pytest.raises(RuntimeError) as exc_info:
            server._run_rvc_inference(str(base_file), str(out_file))
        assert "Lỗi pipeline RVC: Lỗi không xác định từ pipeline RVC" in str(exc_info.value)


def test_discover_model_paths_sorting_and_discovery(tmp_path):
    """Verify discover_model_paths correctly discovers and sorts .pth and .index files."""
    model_dir = tmp_path / "model"
    model_dir.mkdir()

    # Create dummy files
    (model_dir / ".gitkeep").touch()
    (model_dir / "zebra_model.pth").touch()
    (model_dir / "alpha_model.pth").touch()
    (model_dir / "zeta.index").touch()
    (model_dir / "beta.index").touch()

    model_path, index_path = server.discover_model_paths(str(tmp_path))

    assert model_path == str(model_dir / "alpha_model.pth")
    assert index_path == str(model_dir / "beta.index")


def test_discover_model_paths_no_model(tmp_path):
    """Verify discover_model_paths returns (None, '') when directory has no .pth files."""
    model_dir = tmp_path / "model"
    model_dir.mkdir()
    (model_dir / ".gitkeep").touch()

    model_path, index_path = server.discover_model_paths(str(tmp_path))
    assert model_path is None
    assert index_path == ""


def test_discover_model_paths_missing_dir(tmp_path):
    """Verify discover_model_paths auto-creates model/ directory if it does not exist."""
    nonexistent = tmp_path / "nonexistent"
    model_path, index_path = server.discover_model_paths(str(nonexistent))
    assert model_path is None
    assert index_path == ""
    assert (nonexistent / "model").is_dir()


def test_model_list_endpoint(client):
    """Verify GET /model/list returns status 200 with model directory and file lists."""
    response = client.get("/model/list")
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert data.get("ok") is True
    assert "model_dir" in data
    assert "pth_files" in data
    assert "index_files" in data


def test_model_create_folder_endpoint(client):
    """Verify POST /model/create-folder idempotently creates model folder and returns path."""
    response = client.post("/model/create-folder")
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert data.get("ok") is True
    assert "model_dir" in data
    assert os.path.isdir(data["model_dir"])


def test_model_reload_endpoint(client):
    """Verify POST /model/reload triggers model reloading and returns health status."""
    response = client.post("/model/reload")
    assert response.status_code == 200
    data = response.get_json()
    assert data is not None
    assert "ok" in data
    assert "model_loaded" in data
    assert "model_dir" in data


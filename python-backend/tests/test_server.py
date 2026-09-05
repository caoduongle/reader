import os
import sys
from unittest.mock import MagicMock, patch
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


def test_health_endpoint_returns_ok(client):
    """Verify GET /health returns HTTP 200 with status and model loading flag."""
    response = client.get("/health")
    assert response.status_code == 200

    data = response.get_json()
    assert data is not None
    assert data.get("ok") is True
    assert "model_loaded" in data


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


def test_speak_options_preflight_no_origin(client):
    """Verify OPTIONS /speak with no Origin header returns HTTP 204 without CORS headers."""
    response = client.options("/speak")
    assert response.status_code == 204
    assert response.headers.get("Access-Control-Allow-Origin") is None


def test_speak_valid_request_returns_audio_wav(client):
    """Verify POST /speak returns HTTP 200 with audio/wav mimetype on successful synthesis."""
    dummy_wav_bytes = b"RIFF....WAVEfmt ....data...."

    async def mock_synth(text, out_path):
        with open(out_path, "wb") as f:
            f.write(b"dummy_base_audio")

    def mock_infer(in_path, out_path):
        with open(out_path, "wb") as f:
            f.write(dummy_wav_bytes)

    with patch.object(server, "_synthesize_base", side_effect=mock_synth), \
         patch.object(server.rvc, "infer_file", side_effect=mock_infer):
        response = client.post("/speak", json={"text": "Hôm nay trời rất đẹp."})
        assert response.status_code == 200
        assert response.mimetype == "audio/wav"
        assert response.data == dummy_wav_bytes

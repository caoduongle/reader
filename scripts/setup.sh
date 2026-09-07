#!/usr/bin/env bash
# ==============================================================================
# VoxRead - macOS / Linux One-Click Setup Script (Bash)
# ==============================================================================
# Thiết lập môi trường toàn diện cho VoxRead:
# 1. Kiểm tra môi trường Node.js (>= 18), npm, và Python (>= 3.10)
# 2. Cài đặt các gói JavaScript ở thư mục gốc (npm install)
# 3. Tạo môi trường ảo Python (venv) tại python-backend/venv
# 4. Cài đặt các thư viện phụ thuộc Python (pip install -r requirements.txt)
# ==============================================================================

set -euo pipefail

# ANSI color codes
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${PROJECT_ROOT}"

echo -e "${MAGENTA}====================================================================${NC}"
echo -e "${MAGENTA}     VOXREAD - BẮT ĐẦU THIẾT LẬP MÔI TRƯỜNG TỰ ĐỘNG (MACOS/LINUX)   ${NC}"
echo -e "${MAGENTA}====================================================================${NC}"
echo -e "Thư mục dự án: ${PROJECT_ROOT}\n"

function step_header() {
    echo -e "\n${CYAN}====================================================================${NC}"
    echo -e "${CYAN}>>> $1${NC}"
    echo -e "${CYAN}====================================================================${NC}"
}

function success() {
    echo -e "${GREEN}[OK] $1${NC}"
}

function fail() {
    echo -e "\n${RED}[ERROR] $1${NC}" >&2
    exit 1
}

# ------------------------------------------------------------------------------
# Bước 1: Kiểm tra Node.js & npm
# ------------------------------------------------------------------------------
step_header "Bước 1/4: Kiểm tra Node.js và npm..."

if ! command -v node >/dev/null 2>&1; then
    fail "Không tìm thấy Node.js. Vui lòng cài đặt Node.js >= 18 từ https://nodejs.org/"
fi

NODE_RAW="$(node -v)"
NODE_VER="${NODE_RAW#v}"
NODE_MAJOR="${NODE_VER%%.*}"

if [ "${NODE_MAJOR}" -lt 18 ]; then
    fail "Yêu cầu Node.js phiên bản >= 18. Phiên bản hiện tại: ${NODE_RAW}"
fi
success "Node.js hợp lệ: ${NODE_RAW}"

if ! command -v npm >/dev/null 2>&1; then
    fail "Không tìm thấy npm. Vui lòng kiểm tra lại cài đặt Node.js."
fi
NPM_RAW="$(npm -v)"
success "npm hợp lệ: v${NPM_RAW}"

# ------------------------------------------------------------------------------
# Bước 2: Kiểm tra Python >= 3.10
# ------------------------------------------------------------------------------
step_header "Bước 2/4: Kiểm tra Python >= 3.10..."

PYTHON_CMD=""
for candidate in python3.10 python3 python; do
    if command -v "${candidate}" >/dev/null 2>&1; then
        if "${candidate}" -c "import sys; assert sys.version_info >= (3, 10)" >/dev/null 2>&1; then
            PYTHON_CMD="${candidate}"
            PY_VERSION="$("${candidate}" -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')")"
            success "Tìm thấy Python tương thích: ${PYTHON_CMD} (Phiên bản ${PY_VERSION})"
            break
        fi
    fi
done

if [ -z "${PYTHON_CMD}" ]; then
    fail "Không tìm thấy Python >= 3.10. Vui lòng cài đặt Python 3.10+."
fi

# ------------------------------------------------------------------------------
# Bước 3: Cài đặt Node.js dependencies
# ------------------------------------------------------------------------------
step_header "Bước 3/5: Cài đặt JavaScript dependencies qua npm..."

npm install
success "Cài đặt npm dependencies thành công!"

# ------------------------------------------------------------------------------
# Bước 4: Cài đặt trình duyệt Chromium cho Playwright (đọc trang web động)
# ------------------------------------------------------------------------------
step_header "Bước 4/5: Cài đặt Chromium cho Playwright (tính năng Đọc từ liên kết với trang JS động)..."

echo -e "${YELLOW}Bước này tải về Chromium headless (~150-300MB), chỉ dùng cho các trang web nạp nội dung bằng JavaScript (ví dụ docln.sbs).${NC}"
if npx --yes playwright install --with-deps chromium; then
    success "Đã cài đặt Chromium cho Playwright thành công!"
else
    echo -e "\n${YELLOW}[CẢNH BÁO] Không thể cài đặt Chromium cho Playwright (có thể do mạng bị chặn).${NC}"
    echo -e "${YELLOW}Tính năng đọc URL cơ bản vẫn hoạt động bình thường; chỉ các trang cần JavaScript mới bị ảnh hưởng.${NC}"
    echo -e "${YELLOW}Bạn có thể thử lại thủ công sau: npx playwright install chromium${NC}\n"
fi

# ------------------------------------------------------------------------------
# Bước 5: Thiết lập Python Backend Virtualenv & Dependencies
# ------------------------------------------------------------------------------
step_header "Bước 5/5: Thiết lập Python backend (virtualenv & requirements)..."

BACKEND_DIR="${PROJECT_ROOT}/python-backend"
VENV_DIR="${BACKEND_DIR}/venv"
VENV_PYTHON="${VENV_DIR}/bin/python"
VENV_PIP="${VENV_DIR}/bin/pip"
REQUIREMENTS_FILE="${BACKEND_DIR}/requirements.txt"

if [ ! -d "${BACKEND_DIR}" ]; then
    fail "Không tìm thấy thư mục python-backend tại ${BACKEND_DIR}"
fi

if [ ! -f "${VENV_PYTHON}" ]; then
    echo -e "${YELLOW}Đang tạo môi trường ảo Python tại ${VENV_DIR}...${NC}"
    "${PYTHON_CMD}" -m venv "${VENV_DIR}"
    success "Đã tạo virtualenv thành công tại ${VENV_DIR}"
else
    success "Virtualenv đã tồn tại sẵn tại ${VENV_DIR}"
fi

# Lưu ý: Các file wheel binary trong python-backend/wheels/ chỉ dành riêng cho Windows (win_amd64).
# Trên Linux / macOS, pip cài đặt fairseq trực tiếp từ PyPI bằng compiler có sẵn (build-essential / clang).
if [ -f "${REQUIREMENTS_FILE}" ]; then
    echo -e "${YELLOW}Đang kiểm tra và cài đặt packages từ requirements.txt...${NC}"
    "${VENV_PYTHON}" -m pip install "pip<24.1" --quiet
    if ! "${VENV_PIP}" install -r "${REQUIREMENTS_FILE}"; then
        echo -e "\n${YELLOW}[GỢI Ý] Nếu gặp lỗi build C++ (ví dụ khi compile fairseq), hãy cài đặt build-essential hoặc python3-dev.${NC}"
        fail "Cài đặt python packages thất bại."
    fi
    success "Cài đặt thư viện Python thành công!"
else
    echo -e "${YELLOW}[CẢNH BÁO] Không tìm thấy ${REQUIREMENTS_FILE}, bỏ qua bước pip install.${NC}"
fi

# Kiểm tra GPU NVIDIA và tự động cài đặt PyTorch hỗ trợ CUDA
echo -e "\n${YELLOW}Đang kiểm tra phần cứng GPU NVIDIA...${NC}"
if command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi >/dev/null 2>&1; then
    echo -e "${CYAN}Phát hiện GPU NVIDIA! Đang tự động cài đặt PyTorch hỗ trợ CUDA (cu118)...${NC}"
    if "${VENV_PIP}" install torch==2.1.1+cu118 torchaudio==2.1.1+cu118 --index-url https://download.pytorch.org/whl/cu118; then
        success "Phát hiện GPU NVIDIA! Đã tự động cài đặt PyTorch CUDA (cu118)."
    else
        echo -e "\n${YELLOW}[CẢNH BÁO] Không thể cài đặt PyTorch CUDA tự động. Bạn có thể thử lại thủ công:"
        echo -e "  pip install torch==2.1.1+cu118 torchaudio==2.1.1+cu118 --index-url https://download.pytorch.org/whl/cu118"
        echo -e "Hoặc xem hướng dẫn tại: docs/rvc-voice-setup.md${NC}\n"
    fi
else
    echo -e "\n${YELLOW}[CẢNH BÁO] Không phát hiện GPU NVIDIA — tiếp tục dùng PyTorch CPU. (Nếu có GPU rời, xem hướng dẫn tại docs/rvc-voice-setup.md)${NC}"
fi

# ------------------------------------------------------------------------------
# Hoàn tất
# ------------------------------------------------------------------------------
echo -e "\n${GREEN}====================================================================${NC}"
echo -e "${GREEN}🎉 THIẾT LẬP HOÀN TẤT THÀNH CÔNG! HỆ THỐNG ĐÃ SẴN SÀNG SỬ DỤNG.     ${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo -e "\n${CYAN}Bạn có thể khởi động VoxRead bằng một trong các lệnh sau:${NC}"
echo -e "  1. Chạy bản Web (trình duyệt):"
echo -e "     ${YELLOW}npm run dev${NC}\n"
echo -e "  2. Chạy bản Desktop Electron:"
echo -e "     ${YELLOW}npm run electron:dev${NC}\n"
echo -e "  3. Chạy server RVC backend thủ công (nếu cần test riêng):"
echo -e "     ${YELLOW}cd python-backend${NC}"
echo -e "     ${YELLOW}source venv/bin/activate${NC}"
echo -e "     ${YELLOW}python server.py${NC}\n"

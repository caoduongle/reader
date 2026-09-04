# Pre-built Windows Wheels (`python-backend/wheels/`)

Thư mục này chứa các file wheel binary (`.whl`) được build sẵn cho môi trường Windows, nhằm mục đích **loại bỏ hoàn toàn yêu cầu cài đặt Microsoft Visual C++ Build Tools** khi cài đặt VoxRead từ đầu.

---

## 1. Danh sách Wheel hiện có

| Package | Phiên bản | Python Tag | Nền tảng | Tên file wheel |
|---|---|---|---|---|
| `fairseq` | `0.12.2` | `cp310-cp310` | `win_amd64` (Windows 64-bit) | `fairseq-0.12.2-cp310-cp310-win_amd64.whl` |

> [!NOTE]
> `rvc-python==0.1.5` phụ thuộc vào `fairseq==0.12.2`. Trên Windows, `fairseq` chứa C++ extension (`libbleu`) yêu cầu Microsoft Visual C++ 14.0+ Build Tools để biên dịch nếu cài từ source `.tar.gz` trên PyPI. Wheel đóng gói sẵn ở đây đã chứa binary compiled (`.pyd`), giúp `pip install` diễn ra tức thì mà không cần compiler.

---

## 2. Hướng dẫn Build lại Wheel (Khi đổi phiên bản Python)

Wheel được gắn chặt (ABI-bound) với phiên bản CPython tương ứng (ví dụ: `cp310` chỉ dùng được cho Python 3.10). Nếu bạn nâng cấp lên **Python 3.11** hoặc **Python 3.12**, bạn cần build lại wheel theo các bước sau trên một máy đã cài **Microsoft Visual C++ Build Tools**:

### Bước 1: Kích hoạt môi trường ảo với phiên bản Python mới
```powershell
# Chuyển vào thư mục backend
cd python-backend

# Tạo và kích hoạt venv với Python mong muốn (ví dụ 3.11)
py -3.11 -m venv venv
.\venv\Scripts\activate
```

### Bước 2: Cài đặt Visual C++ Build Tools (nếu chưa có)
Tải và cài đặt "Desktop development with C++" từ:
👉 [Microsoft Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

### Bước 3: Cài đặt fairseq và build wheel
```powershell
# Nâng cấp pip và wheel tools
python -m pip install --upgrade pip wheel setuptools

# Cài đặt rvc-python hoặc fairseq để biên dịch C++ extension
pip install fairseq==0.12.2

# Đóng gói wheel từ bản đã build sang thư mục wheels/
pip wheel fairseq==0.12.2 -w wheels/ --no-deps --no-build-isolation
```

### Bước 4: Xác nhận tên file wheel
Kiểm tra trong thư mục `python-backend/wheels/` xuất hiện file có tên dạng:
`fairseq-0.12.2-cp<minor>-cp<minor>-win_amd64.whl` (ví dụ: `fairseq-0.12.2-cp311-cp311-win_amd64.whl`).

### Bước 5: Commit vào git
```bash
git add python-backend/wheels/fairseq-*.whl
git commit -m "build: add pre-compiled fairseq wheel for Python 3.x win_amd64"
```

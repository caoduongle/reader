# Server TTS + RVC local — đọc web bằng giọng của bạn

Đây là mảnh còn thiếu để nối vào extension **"AI Đọc Truyện"** bạn đã có sẵn. Extension đó
**không cần sửa gì** — nó đã có sẵn lựa chọn "Giọng của tôi (server local)" và đã chờ sẵn để
gọi tới `http://localhost:8008/speak`. Server trong thư mục này chính là implement đúng "hợp đồng" đó.

## Kiến trúc tổng thể

```
Trang web  →  extension (đã có)  →  http://localhost:8008/speak  →  server.py (thư mục này)
                                                                          │
                                                          Edge-TTS ───────┤─────── RVC (model của bạn)
                                                        (giọng đọc nền)  │      (đổi âm sắc)
                                                                          ▼
                                                                    audio WAV trả về
```

3 việc cần làm, theo đúng thứ tự:

- **Phần A** — Train model giọng của bạn trên Google Colab (miễn phí)
- **Phần B** — Cài & chạy `server.py` trên máy, trỏ vào model vừa train
- **Phần C** — Bật lại extension đã có, chọn nguồn giọng "local"

---

## PHẦN A — Train giọng nói trên Google Colab (miễn phí)

### A1. Chuẩn bị dataset

- **10–30 phút** giọng đọc sạch (khuyến nghị chính thức của Applio — công cụ sẽ dùng để train).
  10–15 phút vẫn train được, nhưng dataset dài & sạch hơn cho giọng giống thật hơn.
- Chỉ 1 người nói, không nhạc nền, không tiếng vang/ồn nặng.
- Xuất **WAV hoặc FLAC** (định dạng lossless), **40kHz hoặc 48kHz**, mono.
- **Không cần 1 file dài liên tục.** Applio chính thức hỗ trợ (và preprocessing mặc định sẽ tự
  làm việc này) chia dataset thành nhiều file ngắn — khuyến nghị mỗi file **10–15 giây** nếu bạn
  tự cắt sẵn. Nếu đưa file dài hơn vào, bước Preprocess cũng tự cắt thành đoạn ~5–15 giây, xoá
  khoảng lặng đầu/cuối, rồi mới đưa vào train — nên nhiều file ngắn có sẵn không phải làm thêm gì.
- Gộp hết vào một thư mục phẳng trên Google Drive (ví dụ `raw_audio_backup/`, tên không
  dấu/không khoảng trắng) — Colab sẽ đọc thẳng dataset từ đó, **không bắt buộc phải nén zip**
  (zip chỉ tiện nếu bạn đang upload từ máy lên, kéo cả đống file cùng lúc; nếu file đã nằm sẵn
  trong Drive như vậy rồi thì khỏi cần nén). Cách trỏ Colab vào đúng thư mục này ở bước A3 dưới.
  (Chỉ cần tạo thư mục con theo từng người nói nếu train nhiều giọng cùng lúc — trường hợp 1
  giọng như ở đây thì để phẳng hết trong 1 thư mục.)

**Đừng lọc quá tay.** RVC vốn quen với dữ liệu hơi ồn một chút (pretrain gốc của nó cũng train
trên dữ liệu không hoàn toàn sạch), và xử lý càng nhiều lớp (denoise + normalize + de-ess...)
càng dễ làm giọng mất chi tiết, nghe "nhựa". Giữ lại hơi thở tự nhiên trong bản ghi — chỉ cắt
tiếng hít thở mạnh/gấp bất thường; xoá sạch mọi tiếng thở sẽ khiến giọng train ra nghe robot.

Nếu bản ghi đã khá sạch (mic tốt, phòng yên tĩnh): không cần lọc gì thêm, chỉ cắt bớt khoảng
lặng dài rồi để Applio tự chuẩn hoá âm lượng lúc train (`Training → Preprocess → Advanced
Settings → Normalization mode → post`), khỏi cần làm tay trong Audacity.

Nếu còn ồn nền / vang / hú, chọn một trong các cách sau:

| Cách | Phù hợp khi | Thao tác |
|---|---|---|
| **Adobe Podcast Enhance Speech** (web, dễ nhất) | Ồn nhẹ, muốn nhanh gọn, không cài gì | `podcast.adobe.com/enhance` → kéo thả file → chờ AI xử lý → tải bản đã lọc về |
| **Audacity** (kiểm soát chi tiết) | Muốn tự tay chỉnh mức độ | Chọn đoạn *chỉ có* tiếng ồn, không giọng → `Effect > Noise Reduction > Get Noise Profile` → chọn (Ctrl+A) cả track → `Effect > Noise Reduction` → OK |
| **`resemble-enhance` ngay trong Colab** | Nhiều file, muốn xử lý hàng loạt luôn trong notebook đang train | Code bên dưới |
| **Ultimate Vocal Remover / Eddy's UVR5 UI (Colab)** | File gốc lẫn nhạc nền (ví dụ cắt ra từ video) | `colab.research.google.com/github/Eddycrack864/UVR5-UI/blob/main/UVR_UI.ipynb` — chạy cell Install rồi Run UI, chọn model `MelBand Roformer \| Denoise by Aufr33` |

**Lọc trực tiếp trong Colab**, chạy trong một cell riêng trước bước Preprocess Dataset — ví dụ
với đúng thư mục `raw_audio_backup` của bạn:
```python
!pip install -q resemble-enhance
!resemble-enhance /content/drive/MyDrive/raw_audio_backup /content/drive/MyDrive/raw_audio_cleaned \
    --denoise_only --device cuda
```
Cờ `--denoise_only` quan trọng: bỏ qua chế độ "enhance" đầy đủ (vốn còn mở rộng dải tần, phục
hồi âm thanh) vì xử lý quá tay kiểu đó dễ làm sai lệch đặc điểm giọng thật — chỉ khử ồn nền là
đủ cho mục đích train RVC. Lệnh này đọc mọi file `.wav` trong `raw_audio_backup/`, xuất bản đã
lọc sang `raw_audio_cleaned/` — dùng đúng thư mục sau (`.../raw_audio_cleaned`) làm `Dataset
path` ở bước Preprocess nếu bạn chạy bước lọc này.

### A2. Mở notebook Colab chính thức của Applio

Applio hiện là công cụ train/dùng RVC được duy trì tích cực nhất, có 2 notebook Colab chính thức:

- **Applio – No UI (khuyến nghị dùng bản này):**
  `https://colab.research.google.com/github/iahispano/applio/blob/main/assets/Applio_NoUI.ipynb`
- Applio – UI (giao diện Gradio, trực quan hơn nhưng rủi ro hơn — xem lưu ý dưới):
  `https://colab.research.google.com/github/iahispano/applio/blob/main/assets/Applio.ipynb`

> ⚠️ **Vì sao ưu tiên bản No UI:** chính đội ngũ Applio khuyến cáo dùng bản này trên Colab miễn
> phí, vì mở giao diện Gradio public (qua localtunnel) trong thời gian dài dễ khiến Google Colab
> ngắt phiên với lỗi "disallowed usage" — Colab free không cho phép chạy app giao diện web public
> kéo dài. Bản No UI vẫn có các ô nhập liệu (tên model, đường dẫn, số epoch...) như một form bình
> thường, chỉ là chạy bằng cell lệnh thay vì mở web app riêng, nên an toàn hơn nhiều cho phiên train
> dài. Nếu bạn muốn giao diện quen thuộc (giống mô tả trong file bạn đính kèm), bản UI vẫn dùng
> được, chỉ là cân nhắc rủi ro bị ngắt phiên khi train lâu.

### A3. Các bước train (thứ tự giống nhau ở cả 2 bản)

1. **Install Applio** — chạy cell đầu tiên, đợi cài xong (khoảng 2 phút).
2. **Sync with Google Drive** — chạy cell này, cấp quyền Drive. Quan trọng: Colab free tự ngắt
   phiên sau vài giờ hoặc khi rảnh quá lâu; cell này lưu tiến trình vào `ApplioBackup/` trên Drive
   để không mất công nếu bị ngắt giữa chừng.
3. **Preprocess Dataset**
   - `Model name`: đặt tên, ví dụ `my_voice_v1`
   - `Dataset path`: đây chỉ là một **ô dán đường dẫn dạng chữ**, không phải nút upload/chọn zip.
     Sau khi Drive đã mount ở bước 2, toàn bộ Drive của bạn nằm sẵn tại `/content/drive/MyDrive/`
     trong Colab — nên nếu dataset là một thư mục tên `raw_audio_backup` nằm ngay gốc "Drive của
     tôi", dán đúng: `/content/drive/MyDrive/raw_audio_backup`. Không cần nén zip gì cả — Applio
     đọc thẳng các file trong thư mục đã mount. Chỉ cần đảm bảo tên thư mục không dấu/không
     khoảng trắng (`raw_audio_backup` đã ổn).
   - `Sample rate`: 40k hoặc 48k
4. **Extract Features**
   - `f0 method`: chọn **rmvpe** (khuyến nghị chính thức — nhẹ và chính xác nhất hiện nay)
5. **Train**
   - `Total epoch`: **200–300** (dưới 150 giọng còn mờ; trên 400 dễ vỡ tiếng/overfit)
   - `Batch size`: **8** (GPU T4 free của Colab có 16GB VRAM, thoải mái hơn máy cá nhân — có thể
     thử tăng lên 12 nếu không gặp lỗi hết bộ nhớ)
   - `Save frequency`: 20–50 epoch/lần
6. **Train Feature Index** — bấm sau khi train xong, tạo file `.index` (quyết định độ sắc nét/giống)
7. **Export Model** — sang tab Export, chọn đúng file `.pth` và `.index` vừa train, bấm Upload.
   2 file này sẽ nằm trong Drive ở thư mục **`ApplioExported/`**.

### A4. Tải model về máy

"Export Model" ở bước 7 chỉ **tự động tải lên Google Drive** — không tự tải thẳng về máy tính
bạn, nên cần thêm một bước thủ công. Vào Google Drive → `ApplioExported/` → tải 2 file:
- `my_voice_v1.pth`
- file `.index` (thường tên dài kiểu `added_IVF...my_voice_v1_v2.index` — đổi tên gọn lại cũng được)

rồi copy cả 2 vào thư mục `model/` trong folder server này (xem Phần B3).

> Phân biệt 2 thư mục Drive: `ApplioBackup/` chỉ chứa checkpoint để *tiếp tục train* nếu bị ngắt
> phiên (không dùng để chạy giọng đọc được) — còn `ApplioExported/` mới là model hoàn chỉnh, đây
> là 2 file cần tải về để dùng với `server.py`.

### Vài lưu ý khi train trên Colab free

**Backup trong lúc train diễn ra tự động.** Miễn là bạn đã chạy cell *Sync with Google Drive*
lúc đầu phiên, cứ mỗi `Save frequency` epoch (đặt 20–50 ở bước Train phía trên), Applio tự lưu
checkpoint vào `ApplioBackup/` trên Drive — không cần bấm gì thêm giữa chừng.

**Nếu bị ngắt phiên giữa chừng**, chỉ mất phần tiến trình từ checkpoint gần nhất trở đi (tối đa
`Save frequency` epoch). Cách tiếp tục: mở lại notebook → chạy lại *Install Applio* + *Sync with
Google Drive* → sang tab Train, nhập **đúng tên model cũ**, **đúng sample rate cũ** → tăng
`Total epoch` lên → bấm Train lại. Applio tự nhận checkpoint cũ trong `ApplioBackup/` và train
tiếp, không làm lại từ đầu. Muốn an tâm hơn, đặt `Save frequency` thấp hơn (ví dụ 20 thay vì 50)
— checkpoint lưu thường hơn, đổi lại tốn thêm chút dung lượng Drive.

- Mỗi phiên Colab free giới hạn khoảng vài giờ và tự ngắt nếu tab rảnh quá lâu — cứ để tab mở,
  thỉnh thoảng quay lại tương tác.
- Drive gần đầy dễ gây lỗi khi train (checkpoint + cache spectrogram khá nặng) — dọn bớt dung
  lượng nếu cần.

---

## PHẦN B — Cài đặt & chạy server local

### Yêu cầu

- Python 3.10 (khuyến nghị — bản `rvc-python` dùng ở đây test kỹ nhất trên Python này)
- Có GPU NVIDIA thì tốc độ gần như tức thời; không có GPU vẫn chạy được bằng CPU, chỉ chậm hơn
  (vài giây/câu thay vì dưới 1 giây)

### B1. Tạo môi trường ảo & cài thư viện

**Windows:**
```powershell
py -3.10 -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

**macOS / Linux:**
```bash
python3.10 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### B2. Cài PyTorch đúng bản cho máy bạn

**Nếu có GPU NVIDIA** — chạy tiếp lệnh này trong cùng venv vừa kích hoạt:
```
pip install torch==2.1.1+cu118 torchaudio==2.1.1+cu118 --index-url https://download.pytorch.org/whl/cu118
```
(GPU đời rất mới có thể cần bản CUDA khác — xem lựa chọn phù hợp tại pytorch.org/get-started/locally)

**Nếu không có GPU riêng** — không cần làm gì thêm, `requirements.txt` đã kéo theo bản CPU sẵn.
Chỉ cần mở `server.py`, đổi `DEVICE = "cuda:0"` thành `DEVICE = "cpu:0"`.

### B3. Đặt file model vào đúng chỗ

Copy 2 file `.pth` và `.index` đã tải từ Colab (Phần A4) vào thư mục `model/` trong folder này.
Mở `server.py`, sửa đúng 3 dòng đầu trong phần cấu hình cho khớp tên file thật của bạn:

```python
MODEL_PATH = "model/my_voice_v1.pth"
INDEX_PATH = "model/my_voice_v1.index"
DEVICE = "cuda:0"          # hoặc "cpu:0" nếu không có GPU NVIDIA
```

Ngoài ra có thể chỉnh `BASE_VOICE` (giọng Edge-TTS đọc nền — nên chọn cùng giới tính với giọng
bạn train để RVC biến đổi ít nhất, ra chất lượng tốt nhất) và `PITCH_SHIFT` nếu nghe lệch tông.

### B4. Chạy server

```
python server.py
```

Lần đầu chạy, thư viện sẽ **tự tải thêm** 2 file nền `hubert_base.pt` và `rmvpe.pt`
(khoảng 200–300MB, cần mạng) — chỉ tải một lần duy nhất. Thấy dòng:

```
Model san sang. Server dang chay tai http://localhost:8008
```

là xong — **giữ cửa sổ terminal này mở** trong lúc dùng extension. Kiểm tra nhanh: mở
`http://localhost:8008/health` trên trình duyệt, thấy `{"ok": true, ...}` là server đang sống.

---

## PHẦN C — Dùng với extension đã có

Không cần sửa bất kỳ file nào trong extension. Chỉ cần:

1. Load extension vào Chrome như README gốc của nó mô tả (`chrome://extensions` → bật
   **Developer mode** → **Load unpacked** → chọn thư mục extension).
2. Bấm icon extension → mục **Nguồn giọng đọc**, chọn **"Giọng của tôi (server local)"** →
   **Lưu cài đặt**. (Ở chế độ này không cần nhập Gemini API key.)
3. Mở trang muốn nghe → bấm icon extension → **▶ Bắt đầu đọc trang này**.

Nếu extension báo *"Không kết nối được server local"* nghĩa là `server.py` chưa chạy hoặc đã
tắt — quay lại terminal, chạy lại `python server.py`.

---

## Xử lý sự cố thường gặp

| Hiện tượng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `ModuleNotFoundError: rvc_python` | Chưa kích hoạt venv | Chạy lại `venv\Scripts\activate` (Windows) hoặc `source venv/bin/activate` |
| `CUDA out of memory` | GPU không đủ VRAM | Đổi `DEVICE` sang `"cpu:0"`, hoặc đóng bớt ứng dụng khác đang dùng GPU |
| Giọng nghe méo, rè, "lẫn" giọng nền | `index_rate` / `protect` chưa hợp | Trong `RVC_PARAMS`: thử giảm `index_rate` xuống 0.5–0.6, tăng `protect` lên 0.4–0.5 |
| Giọng lệch tông (quá cao/thấp so với bạn) | `BASE_VOICE` khác giới tính với giọng đã train | Đổi `BASE_VOICE` cho cùng giới tính, hoặc chỉnh `PITCH_SHIFT` thành `12` / `-12` |
| Đọc chậm, hay khựng giữa các câu | Đang chạy bằng CPU | Bình thường nếu không có GPU — extension đã tự tải trước 1–2 câu kế tiếp để đỡ giật, nhưng CPU vẫn chậm hơn GPU rõ rệt |
| Lỗi tải/giải mã audio ngay câu đầu | Thiếu ffmpeg trên máy (hiếm gặp) | Cài ffmpeg hệ thống (`winget install ffmpeg` trên Windows, `brew install ffmpeg` trên macOS, `apt install ffmpeg` trên Linux) |
| Không tải được `hubert_base.pt` / `rmvpe.pt` | Mất mạng giữa chừng lúc tự tải | Xoá thư mục `base_model` bên trong package `rvc_python` (trong `venv/Lib/site-packages/rvc_python/` hoặc tương đương) để nó tải lại, hoặc tải thủ công từ `huggingface.co/lj1995/VoiceConversionWebUI` |

---

## Một lưu ý

Applio (công cụ train ở Phần A) chỉ cho phép dùng với giọng nói mà bạn sở hữu hoặc được phép sử
dụng — đúng như bạn đang làm (giọng của chính bạn). Nếu sau này muốn train thêm giọng người
khác (bình luận viên, người nổi tiếng...), nên có sự đồng ý của họ trước khi dùng hoặc chia sẻ
audio tạo ra.

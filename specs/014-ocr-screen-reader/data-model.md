# Data Model & Architecture: Desktop OCR Screen Reader Fallback

**Feature**: `014-ocr-screen-reader`  
**Date**: 2026-09-04  

---

## 1. Entities & Data Structures

### 1.1 Region Rectangle (`RegionRect`)
Represents the spatial coordinates of the selected rectangular area on the primary screen.

| Field | Type | Required | Description |
|---|---|---|---|
| `x` | `number` | Yes | Top-left X coordinate in logical screen pixels (≥ 0). |
| `y` | `number` | Yes | Top-left Y coordinate in logical screen pixels (≥ 0). |
| `width` | `number` | Yes | Width of selected region in pixels (minimum valid: 5). |
| `height` | `number` | Yes | Height of selected region in pixels (minimum valid: 5). |

### 1.2 OCR Request (`OcrRequestPayload`)
HTTP JSON payload sent by the Electron main process to Express `POST /api/ocr`.

| Field | Type | Required | Description |
|---|---|---|---|
| `image` | `string` | Yes | Base64-encoded PNG image data. May optionally start with data URI prefix (`data:image/png;base64,`). Max decoded size: 15MB. |

### 1.3 OCR Success Response (`OcrSuccessResponse`)
HTTP 200 response returned by Express `POST /api/ocr`.

| Field | Type | Required | Description |
|---|---|---|---|
| `ok` | `boolean` | Yes | Always `true`. |
| `text` | `string` | Yes | Verbatim plain text extracted from image (may be empty if no text found). |

### 1.4 OCR Error Response (`OcrErrorResponse`)
HTTP 400 / 500 / 503 error response returned by Express `POST /api/ocr`.

| Field | Type | Required | Description |
|---|---|---|---|
| `ok` | `boolean` | Yes | Always `false`. |
| `error` | `string` | Yes | Localized Vietnamese explanation of the failure. |

---

## 2. State Transition & Execution Flow

```mermaid
stateDiagram-v2
    [*] --> Idle: App running & shortcut registered
    Idle --> ClipboardCheck: User presses Ctrl+Shift+Space
    
    ClipboardCheck --> DirectTTS: Clipboard has fresh text
    DirectTTS --> Idle: Audio plays via specs/013
    
    ClipboardCheck --> HealthCheck: Clipboard empty or unchanged
    
    HealthCheck --> AlertNoKey: geminiConfigured == false
    AlertNoKey --> Idle: Show guidance dialog
    
    HealthCheck --> OverlayOpen: geminiConfigured == true
    
    OverlayOpen --> Cancelled: User presses Escape or < 5px drag
    Cancelled --> Idle: Overlay closes cleanly
    
    OverlayOpen --> Capturing: Mouse released with valid rect
    Capturing --> OverlayLoading: Show "Đang nhận diện..."
    OverlayLoading --> ScreenCaptured: desktopCapturer + crop
    
    ScreenCaptured --> CaptureFailed: Screen capture blocked
    CaptureFailed --> Idle: Close overlay & show capture error
    
    ScreenCaptured --> CallingOcr: POST /api/ocr
    CallingOcr --> OcrFailed: Network/Gemini error
    OcrFailed --> Idle: Close overlay & show OCR error
    
    CallingOcr --> OcrEmpty: text.trim() == ""
    OcrEmpty --> Idle: Close overlay & notify no text found
    
    CallingOcr --> TextSuccess: text.trim() != ""
    TextSuccess --> AudioPlay: Send IPC 'screen-reader:clipboard-captured'
    AudioPlay --> Idle: Close overlay, focus mainWindow, play TTS
```

---

## 3. Component Architecture

```mermaid
graph TD
    A[Global Shortcut Ctrl+Shift+Space] --> B{Clipboard Check in main.ts}
    B -- Fresh text found --> C[Existing Clipboard Pipeline]
    B -- Empty or Unchanged --> D[Health Check GET /health]
    
    D -- geminiConfigured: false --> E[Show Warning Dialog: Missing Key]
    D -- geminiConfigured: true --> F[regionOverlay.ts: Transparent Overlay Window]
    
    F -- User Esc or <5px click --> G[Close Overlay]
    F -- Valid selection rect --> H[screenCapture.ts: desktopCapturer + nativeImage.crop]
    
    H --> I[POST http://127.0.0.1:3001/api/ocr]
    I --> J[server.js: GoogleGenAI gemini-2.5-flash]
    
    J -- Extracted Text --> K[IPC send: 'screen-reader:clipboard-captured']
    K --> L[useScreenReaderClipboard.ts -> App.tsx -> useTTS auto play]
```
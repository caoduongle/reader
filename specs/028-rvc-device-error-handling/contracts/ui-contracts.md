# UI Component Contracts: Warning Banners & Toast Notifications

**Feature**: `028-rvc-device-error-handling`  
**Date**: 2026-09-05  

---

## 1. SettingsModal Banner UI Contract

When `effectiveStatus` is `'no-model'` or `'model_missing'`:
- **Background**: `bg-amber-500/10`
- **Border**: `border-amber-500/30`
- **Text Color**: `text-amber-300`
- **Badge Dot**: `bg-amber-500 ring-2 ring-amber-500/30` with label `"Chưa có model"`
- **Header**: `"Server giọng đọc đang chạy nhưng chưa có file model (.pth/.index)"` (or `"Lỗi khởi tạo model giọng đọc"`)
- **Body**: Renders `serverErrorMessage` (passed from `useTTS` or `useVoiceServerStatus`) alongside folder path and action buttons (`+ Thêm model`, `Mở thư mục`).

When `effectiveStatus` is `'unreachable'`:
- **Background**: `bg-rose-500/10`
- **Border**: `border-rose-500/30`
- **Text Color**: `text-rose-300`
- **Badge Dot**: `bg-rose-500 ring-2 ring-rose-500/30` with label `"Chưa kết nối"`
- **Header**: `"Không kết nối được server giọng đọc tại <url>"`
- **Body**: Renders `serverErrorMessage` (or connection error details) and terminal troubleshooting commands.

When `effectiveStatus` is `'connected'`:
- **Badge Dot**: `bg-emerald-500 ring-2 ring-emerald-500/30` with label `"Đã kết nối"`
- **Loaded Model Info**: Displays active `.pth` model name.

---

## 2. App.tsx Mid-Reading Toast Contract

- **Trigger**: When `serverErrorMessage` becomes non-null during active book reading while `isSettingsOpen === false`.
- **Action**: Call `showToast(serverErrorMessage)` with auto-dismiss duration of 2400ms.
- **Goal**: Guarantee the user sees a visible alert explanation when RVC playback halts unexpectedly instead of wondering why reading stopped.

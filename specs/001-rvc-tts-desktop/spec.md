# Feature Specification: Local Voice Cloning (RVC) Integration & Windows Desktop Packaging

**Feature Branch**: `001-rvc-tts-desktop`  
**Created**: 2026-09-01  
**Status**: Draft  
**Input**: User description: "Tích hợp giọng đọc RVC local vào VoxRead + đóng gói thành app Windows"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Personalized Cloned Voice Reading (Priority: P1)

As a book lover using VoxRead, I want to listen to books and documents using my own cloned voice (powered by my local voice engine) instead of generic system/browser synthesized voices, so that my reading experience feels personal, natural, and expressive.

**Why this priority**: Delivering high-quality personalized narration is the core value proposition of this feature. Without this, VoxRead remains limited to standard system voices.

**Independent Test**: Can be tested independently in a web browser by configuring a running local voice engine endpoint in Settings, selecting "My Voice (Local Server)", and initiating speech playback on any loaded chapter.

**Acceptance Scenarios**:
1. **Given** the local voice engine is running and reachable, **When** the user selects "My Voice (Local RVC)" in settings and initiates playback on a sentence, **Then** the audio is synthesized by the local engine and played through the reader, advancing sentence-by-sentence with visual highlighting.
2. **Given** the user is in Settings, **When** they click "Test Voice" under the local voice provider, **Then** a sample Vietnamese sentence is synthesized and played immediately to preview voice quality.
3. **Given** the user changes the reading speed slider (e.g., to 1.25x or 1.5x), **When** audio plays using the local voice provider, **Then** the playback rate dynamically adjusts to the configured speed without pitch distortion.
4. **Given** audio is playing via the local voice provider, **When** the user clicks pause, resume, next sentence, previous sentence, or jumps to a specific paragraph, **Then** audio playback controls respond synchronously without audio overlap or state misalignment.

---

### User Story 2 - Voice Engine Health Monitoring & Graceful Recovery (Priority: P2)

As a reader, I want immediate visual awareness of whether my local voice engine is connected and healthy, so that I understand why playback might fail before pressing play and can troubleshoot easily.

**Why this priority**: A local backend service can be offline or starting up. Without real-time status indication, failed network calls appear as silent UI bugs or mysterious freezes.

**Independent Test**: Can be tested by starting and stopping the local server while observing the status indicator in Settings, and verifying that appropriate status banners and fallback options appear.

**Acceptance Scenarios**:
1. **Given** the local voice server is not running or is unreachable at the configured URL, **When** the user opens Settings or selects the local voice option, **Then** an unambiguous status badge (e.g., red indicator) and diagnostic warning message are displayed stating that the server is unreachable at that address.
2. **Given** the local server is unreachable, **When** the user attempts to play audio with the local provider selected, **Then** playback is prevented, an informative non-intrusive alert prompts the user to verify server status, and existing reading position is preserved.
3. **Given** the user experiences an unreachable local server, **When** they switch back to the built-in "System / Browser Voice" provider, **Then** normal text-to-speech functionality operates immediately using local browser voices with no restart needed.

---

### User Story 3 - Latency-Minimized Seamless Narration via Audio Prefetching (Priority: P3)

As a reader listening to a long chapter, I want sentences to flow smoothly one after another without annoying multi-second gaps between sentences, so that the reading flow feels conversational and cohesive.

**Why this priority**: On-the-fly local neural voice synthesis takes computing time (1-3 seconds per sentence). Prefetching the upcoming sentences while the current sentence plays eliminates audible latency.

**Independent Test**: Can be tested by reading consecutive sentences in a chapter and verifying that the transition delay between consecutive sentences is imperceptible (under 200ms) rather than waiting for on-demand synthesis after each sentence ends.

**Acceptance Scenarios**:
1. **Given** sentence $N$ is actively playing, **When** playback begins, **Then** the system automatically requests synthesis of sentence $N+1$ in the background and holds the generated audio in memory.
2. **Given** sentence $N$ completes playback, **When** the reader advances to sentence $N+1$, **Then** the pre-synthesized audio begins playback immediately without delay.
3. **Given** the user jumps abruptly to a distant sentence or changes chapters, **When** navigation occurs, **Then** stale prefetched audio is cleanly evicted from memory and synthesis prioritizes the newly selected sentence.

---

### User Story 4 - Native Windows Application with Automatic Engine Management (Priority: P4)

As a Windows user, I want VoxRead to operate as a self-contained desktop application that launches its own background voice engine automatically, so that I do not need to manually open terminals, run command-line commands, or remember port numbers.

**Why this priority**: Eliminates developer-centric friction for everyday reading, turning a complex multi-process technical stack into a one-click desktop software experience.

**Independent Test**: Can be tested by launching the packaged Windows executable, verifying that the background engine process starts automatically, the reader UI connects upon readiness, and closing the app cleanly cleans up all background processes.

**Acceptance Scenarios**:
1. **Given** the user launches VoxRead on Windows, **When** the application starts, **Then** the background voice engine is automatically spawned and polled until ready, whereupon the reader interface becomes active.
2. **Given** the voice engine prerequisite environment (e.g. virtual environment or model files) has not yet been set up, **When** the desktop app launches, **Then** a clear, friendly Vietnamese error/guidance dialog appears explaining what is missing, while still allowing the user to enter the app and use built-in voices.
3. **Given** the application window is closed by clicking the close (X) button, **When** tray minimization is enabled, **Then** the window hides to the Windows system tray and the voice engine remains warm and active in memory.
4. **Given** the user selects "Exit / Thoát" from the system tray menu or application menu, **When** the application quits, **Then** all spawned background engine processes are definitively terminated, leaving no lingering orphan processes in Windows Task Manager.

---

### Edge Cases

- **Server Connection Dropped Mid-Chapter**: If the local voice engine terminates or becomes unresponsive while a chapter is playing, playback must pause gracefully, an alert banner must notify the reader, and the active sentence position must be retained.
- **Rapid Navigation / Skipping**: If the user rapidly clicks "Next Sentence" or scrubs through the document, pending synthesis requests must be aborted or ignored, avoiding queue pileups and audio crosstalk.
- **Empty or Whitespace Sentences**: Sentences containing only formatting whitespace or punctuation must be handled gracefully without triggering superfluous synthesis requests.
- **Port Conflicts**: If the default local port is occupied by another service, the user must be able to change the server URL in Settings and have the client connect to the custom port.
- **Absence of Internet Connectivity**: Once voice models are present locally, the local synthesis and playback must function completely offline (Edge-TTS fallback may require network, but errors must be clearly messaged).
- **Multiple App Instances**: Launching a second instance of the desktop application must bring the existing window to the front rather than launching a duplicate background server on the same port.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Voice Provider Configuration
- **FR-001**: The system MUST allow users to select between two distinct voice providers in Settings:
  1. "Giọng máy (mặc định)" (Built-in Browser Speech Synthesis)
  2. "Giọng của tôi (RVC local)" (Local Voice Cloning Engine)
- **FR-002**: The default voice provider MUST remain "Giọng máy (mặc định)" so that existing user preferences and out-of-the-box operation remain fully backward-compatible.
- **FR-003**: When "Giọng máy (mặc định)" is selected, the settings UI MUST present the standard list of detected system voices, search filter, and language filter.
- **FR-004**: When "Giọng của tôi (RVC local)" is selected, the settings UI MUST hide the system voices list and present:
  1. An editable Server URL configuration field (defaulting to `http://localhost:8008`).
  2. A real-time connection status indicator (Connected / Unreachable / Checking).
  3. A dedicated "Test Voice" action to verify audio output from the local server.

#### Playback Engine & Audio Pipeline
- **FR-005**: The system MUST preserve all existing external reading controls and states (`isPlaying`, `isPaused`, `currentSentenceIndex`, `play`, `pause`, `resume`, `togglePlay`, `stop`, `nextSentence`, `prevSentence`, `jumpToSentence`, `jumpToParagraph`).
- **FR-006**: When playing under "Giọng của tôi (RVC local)", the system MUST send a speech generation request containing sentence text to the configured server endpoint and stream/render the resulting audio response via a reusable media audio element.
- **FR-007**: When sentence audio finishes playing, the system MUST automatically advance to the next sentence, update sentence highlighting, and trigger chapter completion callbacks when the final sentence concludes.
- **FR-008**: While sentence $N$ is playing, the system MUST automatically pre-fetch audio for sentence $N+1$ and store up to 3 upcoming sentence audio blobs in memory to ensure zero-latency transitions.
- **FR-009**: The system MUST apply the user's reading speed setting directly to the local voice audio playback rate.
- **FR-010**: Pitch adjustments MUST be disabled or locked for the local cloned voice provider, as pitch characteristics are fixed by the trained voice model.

#### Health Verification & Diagnostics
- **FR-011**: The system MUST verify connectivity to the local voice server health endpoint upon initial mount and whenever the provider selection or server URL is modified.
- **FR-012**: If the local server is unreachable when the user attempts playback or opens Settings, the system MUST display a clear, localized diagnostic message (e.g., "Không thể kết nối với server giọng đọc tại http://localhost:8008 — vui lòng kiểm tra server").

#### Desktop Application Packaging (Windows)
- **FR-013**: The application MUST be packaged as a standalone Windows desktop application (`.exe`), operable without requiring command-line interaction during normal daily usage.
- **FR-014**: Upon application startup, the desktop host process MUST automatically spawn the background Python voice service using its isolated virtual environment executable.
- **FR-015**: The desktop host MUST poll the server health endpoint (up to 60 seconds) until ready before loading the main user interface; if startup fails or prerequisites are missing, it MUST display a descriptive dialog and continue loading the UI with built-in voices enabled.
- **FR-016**: The desktop application MUST feature a System Tray icon. Closing the main window (X) MUST minimize the application to the tray rather than abruptly terminating the background server.
- **FR-017**: Selecting "Exit / Thoát" from the tray menu MUST terminate the background server process and completely close the application.
- **FR-018**: The installer/executable build package MUST NOT bundle Python virtual environments or heavy model weights into the application archive; instead, it MUST load them from external configurable or relative directories.

---

### Key Entities

- **TTS Configuration**:
  - `ttsProvider`: Provider selector (`'browser'` | `'rvc-local'`).
  - `rvcServerUrl`: URL of the local voice cloning server (default `http://localhost:8008`).
  - `rate`: Playback speed factor ($0.5\times$ to $3.0\times$).
  - `volume`: Playback loudness level ($0.0$ to $1.0$).
- **Audio Cache Item**:
  - `sentenceIndex`: Numeric index of the cached sentence within the current chapter.
  - `audioBlobUrl`: Object URL reference to synthesized binary audio data.
  - `timestamp`: Timestamp when cached, used for eviction.
- **Server Health State**:
  - `status`: One of `'unknown'`, `'connected'`, `'unreachable'`.
  - `lastChecked`: Timestamp of last ping.
  - `errorMessage`: Optional diagnostic detail string.
- **Desktop Runtime State**:
  - `backendProcessId`: PID of the spawned background server.
  - `isServerReady`: Boolean indicating successful handshake.
  - `trayMinimized`: Window visibility status.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Consecutive sentence transition latency is less than $200\text{ ms}$ under local cloned voice playback when prefetch cache is populated.
- **SC-002**: $0$ command-line terminals or manual shell scripts need to be opened by the end user during regular daily reading on Windows once initial one-time model setup is completed.
- **SC-003**: Server offline or connection timeout states are detected and visually indicated to the user within $3\text{ seconds}$ of opening Settings or initiating playback.
- **SC-004**: $100\%$ of existing reading features (browser voice selection, typography, themes, bookmarks, reading statistics, search, mascot companions) remain fully functional without regressions.
- **SC-005**: $100\%$ of spawned background processes are guaranteed to terminate upon selecting "Exit" from the desktop application, preventing zombie process accumulation.
- **SC-006**: Users can switch seamlessly between "Giọng máy" and "Giọng của tôi" at any time with a single click, taking effect immediately on the next sentence spoken.

---

## Assumptions

- **Local Machine Capabilities**: The user's Windows device meets the hardware/software requirements to run PyTorch and RVC inference locally (either with NVIDIA GPU CUDA acceleration or CPU mode).
- **Prerequisite Setup**: The Python virtual environment (`python-backend/venv`) and trained voice model files (`model/*.pth`, `model/*.index`) are prepared once by the user following the backend setup guide and placed in the designated directory.
- **Network Interface**: The local voice server binds to `127.0.0.1` / `localhost` and does not require external cloud authorization or external public IP exposure.
- **Audio Format**: The local voice cloning server returns standard uncompressed or standard compressed audio bytes (`audio/wav`) natively playable by browser media elements.
- **Language Scope**: Cloned voice model input text is currently focused on Vietnamese (`language: 'vi'`), while fallback browser voices continue to support all available international languages.

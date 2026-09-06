# Data Model: Accurate Audio Resume via Loaded Audio Index Reference

**Feature**: `043-tts-loaded-audio-index`  
**Date**: 2026-09-06

## Entities & State Structures

### 1. `LoadedAudioIndexTracker`
Mutable reference variable within `useTTS`:

```typescript
const loadedAudioIndexRef = useRef<number | null>(null);
```

- **Type**: `React.MutableRefObject<number | null>`
- **Initial Value**: `null`
- **State Transitions**:
  - Set to `index` immediately before `audio.src = audioBlobUrl;` in `speakSentence`.
  - Set to `null` inside `stop()`.
  - Set to `null` inside `audio.onerror`.

---

### 2. Decision Matrix: In-Place Resume vs Explicit Speak

Given target sentence index $T$:

| `loadedAudioIndexRef.current === T` | `audio.paused` | `audio.ended` | Action Taken | Reason |
| :---: | :---: | :---: | :--- | :--- |
| ✅ True | ✅ True | ❌ False | **In-Place Resume** (`audio.play()`) | Audio for sentence $T$ is loaded and paused mid-playback. Resume immediately. |
| ❌ False (e.g. $T-1$) | ✅ True | ❌ False | **Explicit Speak** (`speakSentence(T)`) | Audio for sentence $T$ is not yet loaded into the player. Must fetch/speak $T$. |
| ❌ False (null) | N/A | N/A | **Explicit Speak** (`speakSentence(T)`) | No audio loaded. |
| ✅ True | ❌ False | ❌ False | **Explicit Speak** (`speakSentence(T)`) | Audio is already playing (not paused). |
| ✅ True | ✅ True | ⚠️ True | **Explicit Speak** (`speakSentence(T)`) | Audio has ended; playing it would restart from beginning unexpectedly. |

---

### 3. Execution Flow Diagram

```mermaid
flowchart TD
    Start[User calls play(T) or resume()] --> CheckProvider{Provider == 'rvc-local'?}
    CheckProvider -- No --> WebSpeech[Handle Web Speech API]
    CheckProvider -- Yes --> CheckAudio{audioRef.current exists?}
    CheckAudio -- No --> CallSpeak[Call speakSentence(T)]
    CheckAudio -- Yes --> GuardCheck{loadedAudioIndex == T <br/>AND audio.paused == true <br/>AND audio.ended == false?}
    GuardCheck -- Yes --> AudioPlay[audio.play() in place]
    GuardCheck -- No --> CallSpeak
```

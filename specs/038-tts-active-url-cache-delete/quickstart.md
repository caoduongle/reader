# Quickstart Validation Guide: Immediate Eviction of Active Sentence URL from Prefetch Cache

**Feature**: 038-tts-active-url-cache-delete | **Date**: 2026-09-06

---

## Scenario 1: TypeScript Validation & Unit Tests

Verify type correctness and ensure no regression across existing tests:

```bash
npm run typecheck
npm test
```

### Expected Outcome:
- `tsc --noEmit` exits with code 0.
- All 16 Vitest test suites (93 tests) pass.

---

## Scenario 2: Rapid Seeking Stress Test

Simulate rapid manual interaction while listening with local RVC voice:

1. Launch application:
   ```bash
   npm run electron:dev
   ```
2. Open a chapter with 20+ sentences.
3. Select "Giọng của tôi (RVC local)" and press Play.
4. While sentence 1 is playing, rapidly click between sentence 5, sentence 12, sentence 3, pause, and play.
5. Observe audio playback and console logs.

### Expected Outcome:
- No banner displaying `Lỗi phát âm thanh WAV (MEDIA_ERR_NETWORK...)`.
- No `FFmpegDemuxer: data source error` in developer tools console.
- Audio plays smoothly from the selected sentence.

---

## Scenario 3: Uninterrupted Sequential Playback

Verify normal automated playback progression:

1. Start playback from sentence 1.
2. Let it play continuously through 5+ sentences without manual interaction.
3. Verify that sentences advance naturally with highlighting.
4. Verify that reaching the end of the chapter completes cleanly without demuxer errors.

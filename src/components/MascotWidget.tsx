import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Volume2,
  VolumeX,
  Sparkles,
  MessageSquareQuote,
  Minimize2,
  RefreshCw,
  EyeOff,
  Settings,
} from 'lucide-react';
import { MascotType, MascotMood, TTSSettings } from '../types';

interface MascotWidgetProps {
  type: MascotType;
  mood: MascotMood;
  isPlaying: boolean;
  isPaused: boolean;
  currentSentenceText?: string;
  currentSentenceIndex: number;
  totalSentences: number;
  settings: TTSSettings;
  onTogglePlay: () => void;
  onChangeMascot: (nextType: MascotType) => void;
  onDisableMascot: () => void;
  onOpenSettings?: () => void;
}

export const MascotWidget: React.FC<MascotWidgetProps> = ({
  type,
  isPlaying,
  isPaused,
  currentSentenceText,
  currentSentenceIndex,
  totalSentences,
  settings,
  onTogglePlay,
  onChangeMascot,
  onDisableMascot,
  onOpenSettings,
}) => {
  const [showSpeechBubble, setShowSpeechBubble] = useState(true);
  const [mascotQuote, setMascotQuote] = useState<string>('Ready to read with you!');
  const [isBlinking, setIsBlinking] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);

  // Blinking effect if enabled in settings
  useEffect(() => {
    if (!settings.mascotBlinkAnimation) {
      setIsBlinking(false);
      return;
    }
    const blinkInterval = setInterval(
      () => {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 180);
      },
      3800 + Math.random() * 2200
    );
    return () => clearInterval(blinkInterval);
  }, [settings.mascotBlinkAnimation]);

  // Talking mouth animation when speech is playing if bounce/animation enabled
  useEffect(() => {
    if (isPlaying && !isPaused && settings.mascotBounceAnimation) {
      const talkInterval = setInterval(() => {
        setMouthOpen(prev => !prev);
      }, 160);
      return () => clearInterval(talkInterval);
    } else {
      setMouthOpen(false);
    }
  }, [isPlaying, isPaused, settings.mascotBounceAnimation]);

  // Mascot dynamic quips
  useEffect(() => {
    if (isPlaying && !isPaused && currentSentenceText) {
      const truncated =
        currentSentenceText.length > 90
          ? currentSentenceText.substring(0, 87) + '...'
          : currentSentenceText;
      setMascotQuote(`"${truncated}"`);
    } else if (isPaused) {
      setMascotQuote('Paused. Tap me or press Space to continue reading!');
    } else if (!isPlaying && totalSentences > 0 && currentSentenceIndex >= totalSentences - 1) {
      setMascotQuote('Chapter completed! What a thrilling read! 🎉');
    } else {
      setMascotQuote('Click me or press Spacebar to start reading!');
    }
  }, [isPlaying, isPaused, currentSentenceText, currentSentenceIndex, totalSentences]);

  const mascotDetails: Record<MascotType, { name: string; title: string; quoteTag: string }> = {
    fox: { name: 'Kitsune', title: 'Story Fox', quoteTag: '🦊' },
    owl: { name: 'Barnaby', title: 'Scholar Owl', quoteTag: '🦉' },
    bot: { name: 'Voxie-9', title: 'Cyber Companion', quoteTag: '🤖' },
    cat: { name: 'Mochi', title: 'Cozy Neko', quoteTag: '🐱' },
    bunny: { name: 'Luna', title: 'Moon Rabbit', quoteTag: '🐰' },
    dragon: { name: 'Ignis', title: 'Astral Dragon', quoteTag: '🐲' },
  };

  const mascotCycle: MascotType[] = ['fox', 'owl', 'bot', 'cat', 'bunny', 'dragon'];
  const handleCycleMascot = (e: React.MouseEvent) => {
    e.stopPropagation();
    const currIdx = mascotCycle.indexOf(type);
    const nextType = mascotCycle[(currIdx + 1) % mascotCycle.length];
    onChangeMascot(nextType);
  };

  return (
    <div
      id="mascot-floating-container"
      className="fixed bottom-20 right-4 sm:right-6 z-40 flex flex-col items-end pointer-events-none select-none"
    >
      {/* Speech Bubble */}
      <AnimatePresence>
        {settings.mascotSpeechBubble && showSpeechBubble && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="pointer-events-auto mb-3 max-w-xs md:max-w-sm rounded-2xl bg-[#16161A] text-slate-200 p-3.5 shadow-2xl backdrop-blur-xl border border-white/10 relative"
          >
            {/* Header info */}
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-white/10 text-xs text-slate-400">
              <div className="flex items-center space-x-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-semibold text-white">
                  {mascotDetails[type]?.name || 'Mascot'}
                </span>
                <span className="text-[11px] text-slate-500">
                  ({mascotDetails[type]?.title || 'Companion'})
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  id="mascot-cycle-btn"
                  title="Switch Character Design"
                  onClick={handleCycleMascot}
                  className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-amber-400 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
                {onOpenSettings && (
                  <button
                    id="mascot-settings-btn"
                    title="Mascot & Animation Settings"
                    onClick={onOpenSettings}
                    className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                )}
                <button
                  id="mascot-disable-quick-btn"
                  title="Disable Mascot Entirely"
                  onClick={onDisableMascot}
                  className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-red-400 transition-colors"
                >
                  <EyeOff className="w-3 h-3" />
                </button>
                <button
                  id="mascot-close-bubble-btn"
                  title="Hide Speech Bubble"
                  onClick={() => setShowSpeechBubble(false)}
                  className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <Minimize2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Bubble Quote */}
            <div className="text-xs md:text-sm text-slate-200 font-serif leading-relaxed italic flex items-start space-x-2">
              <MessageSquareQuote className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span>{mascotQuote}</span>
            </div>

            {/* Reading progress indicator inside bubble */}
            {totalSentences > 0 && (
              <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-sans">
                <span>
                  Sentence {Math.min(currentSentenceIndex + 1, totalSentences)} of {totalSentences}
                </span>
                <span className="font-mono text-amber-400 font-semibold">
                  {Math.round(((currentSentenceIndex + 1) / Math.max(1, totalSentences)) * 100)}%
                </span>
              </div>
            )}

            {/* Speech Bubble Arrow */}
            <div className="absolute -bottom-2 right-8 w-4 h-4 bg-[#16161A] rotate-45 border-r border-b border-white/10" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot Character Avatar */}
      <motion.div
        animate={settings.mascotFloatingAnimation ? { y: [0, -4, 0] } : { y: 0 }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={onTogglePlay}
        title={isPlaying && !isPaused ? 'Click to Pause Reading' : 'Click to Read Aloud'}
        className="pointer-events-auto cursor-pointer relative group flex flex-col items-center"
      >
        {/* Status Pill Badge */}
        {isPlaying && !isPaused && (
          <div
            className={`bg-amber-500 text-black text-[10px] font-extrabold px-3 py-0.5 rounded-full mb-1.5 shadow-xl tracking-wider ${
              settings.mascotBounceAnimation ? 'animate-bounce' : ''
            }`}
          >
            READING NOW
          </div>
        )}

        {/* Mascot Body Container */}
        <div
          id={`mascot-avatar-${type}`}
          className={`w-16 h-16 md:w-18 md:h-18 rounded-2xl flex items-center justify-center p-1.5 transition-all ${
            isPlaying && !isPaused
              ? 'bg-[#1E1E24] border-2 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)] ring-2 ring-amber-500/30'
              : isPaused
                ? 'bg-[#16161A] border border-white/20 shadow-xl'
                : 'bg-[#16161A] border border-white/10 hover:border-amber-500/60 shadow-xl'
          }`}
        >
          {/* 1. FOX MASCOT */}
          {type === 'fox' && (
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow">
              {/* Fox Ears */}
              <polygon points="18,35 30,10 42,32" fill="#d9531e" stroke="#9c340d" strokeWidth="2" />
              <polygon points="24,30 31,16 38,28" fill="#fed7aa" />
              <polygon points="82,35 70,10 58,32" fill="#d9531e" stroke="#9c340d" strokeWidth="2" />
              <polygon points="76,30 69,16 62,28" fill="#fed7aa" />

              {/* Fox Head */}
              <circle cx="50" cy="52" r="34" fill="#ea580c" />
              {/* White muzzle cheeks */}
              <path d="M 22 56 Q 36 78 50 68 Q 64 78 78 56 Q 50 86 22 56 Z" fill="#ffedd5" />

              {/* Eyes */}
              {isBlinking ? (
                <>
                  <line
                    x1="33"
                    y1="46"
                    x2="43"
                    y2="46"
                    stroke="#431407"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <line
                    x1="57"
                    y1="46"
                    x2="67"
                    y2="46"
                    stroke="#431407"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <>
                  <circle cx="38" cy="46" r="4.5" fill="#431407" />
                  <circle cx="39.5" cy="44.5" r="1.5" fill="#ffffff" />
                  <circle cx="62" cy="46" r="4.5" fill="#431407" />
                  <circle cx="63.5" cy="44.5" r="1.5" fill="#ffffff" />
                </>
              )}

              {/* Nose */}
              <ellipse cx="50" cy="58" rx="4" ry="3" fill="#1c1917" />

              {/* Mouth */}
              {mouthOpen ? (
                <ellipse cx="50" cy="65" rx="4.5" ry="4" fill="#881337" />
              ) : (
                <path
                  d="M 46 62 Q 50 66 54 62"
                  stroke="#431407"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              )}

              {/* Reading Spectacles */}
              <circle
                cx="38"
                cy="46"
                r="8"
                fill="none"
                stroke="#d97706"
                strokeWidth="1.5"
                opacity="0.85"
              />
              <circle
                cx="62"
                cy="46"
                r="8"
                fill="none"
                stroke="#d97706"
                strokeWidth="1.5"
                opacity="0.85"
              />
              <line x1="46" y1="46" x2="54" y2="46" stroke="#d97706" strokeWidth="1.5" />
            </svg>
          )}

          {/* 2. OWL MASCOT */}
          {type === 'owl' && (
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow">
              {/* Owl Ear Tufts */}
              <polygon points="26,30 32,12 40,26" fill="#78350f" />
              <polygon points="74,30 68,12 60,26" fill="#78350f" />

              {/* Owl Body */}
              <circle cx="50" cy="52" r="35" fill="#92400e" />
              {/* Face discs */}
              <circle cx="37" cy="46" r="15" fill="#fef3c7" />
              <circle cx="63" cy="46" r="15" fill="#fef3c7" />

              {/* Big Eyes */}
              {isBlinking ? (
                <>
                  <line
                    x1="30"
                    y1="46"
                    x2="44"
                    y2="46"
                    stroke="#451a03"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <line
                    x1="56"
                    y1="46"
                    x2="70"
                    y2="46"
                    stroke="#451a03"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <>
                  <circle cx="37" cy="46" r="6" fill="#1c1917" />
                  <circle cx="39" cy="44" r="2" fill="#ffffff" />
                  <circle cx="63" cy="46" r="6" fill="#1c1917" />
                  <circle cx="65" cy="44" r="2" fill="#ffffff" />
                </>
              )}

              {/* Beak */}
              {mouthOpen ? (
                <polygon points="46,54 54,54 50,65" fill="#f59e0b" />
              ) : (
                <polygon points="46,54 54,54 50,61" fill="#d97706" />
              )}

              {/* Graduation Cap */}
              <polygon points="50,14 74,22 50,30 26,22" fill="#1e293b" />
              <circle cx="50" cy="22" r="2.5" fill="#fbbf24" />
              <line x1="50" y1="22" x2="68" y2="28" stroke="#fbbf24" strokeWidth="1.5" />
            </svg>
          )}

          {/* 3. BOT MASCOT */}
          {type === 'bot' && (
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow">
              {/* Antenna */}
              <line x1="50" y1="24" x2="50" y2="12" stroke="#0284c7" strokeWidth="3" />
              <circle
                cx="50"
                cy="10"
                r="4.5"
                fill={isPlaying && !isPaused ? '#38bdf8' : '#0284c7'}
              />

              {/* Bot Head */}
              <rect
                x="20"
                y="24"
                width="60"
                height="52"
                rx="14"
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="2.5"
              />
              {/* Screen Face */}
              <rect x="26" y="32" width="48" height="36" rx="8" fill="#1e293b" />

              {/* LED Matrix Eyes */}
              {isBlinking ? (
                <>
                  <rect x="33" y="44" width="10" height="2" rx="1" fill="#38bdf8" />
                  <rect x="57" y="44" width="10" height="2" rx="1" fill="#38bdf8" />
                </>
              ) : (
                <>
                  <rect x="33" y="40" width="10" height="9" rx="2" fill="#38bdf8" />
                  <rect x="57" y="40" width="10" height="9" rx="2" fill="#38bdf8" />
                </>
              )}

              {/* Equalizer Mouth */}
              {isPlaying && !isPaused ? (
                <g fill="#22c55e">
                  <rect
                    x="38"
                    y={mouthOpen ? '53' : '55'}
                    width="4"
                    height={mouthOpen ? '7' : '3'}
                    rx="1"
                  />
                  <rect
                    x="44"
                    y={mouthOpen ? '51' : '54'}
                    width="4"
                    height={mouthOpen ? '9' : '5'}
                    rx="1"
                  />
                  <rect
                    x="50"
                    y={mouthOpen ? '50' : '54'}
                    width="4"
                    height={mouthOpen ? '10' : '5'}
                    rx="1"
                  />
                  <rect
                    x="56"
                    y={mouthOpen ? '52' : '55'}
                    width="4"
                    height={mouthOpen ? '8' : '3'}
                    rx="1"
                  />
                </g>
              ) : (
                <line
                  x1="38"
                  y1="56"
                  x2="62"
                  y2="56"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              )}
            </svg>
          )}

          {/* 4. CAT MASCOT */}
          {type === 'cat' && (
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow">
              {/* Ears */}
              <polygon
                points="20,38 30,12 46,30"
                fill="#f87171"
                stroke="#dc2626"
                strokeWidth="1.5"
              />
              <polygon points="26,34 32,18 42,28" fill="#fee2e2" />
              <polygon
                points="80,38 70,12 54,30"
                fill="#f87171"
                stroke="#dc2626"
                strokeWidth="1.5"
              />
              <polygon points="74,34 68,18 58,28" fill="#fee2e2" />

              {/* Cat Face */}
              <circle cx="50" cy="54" r="33" fill="#fde047" />
              <path d="M 28 58 Q 50 82 72 58 Z" fill="#ffffff" />

              {/* Eyes */}
              {isBlinking ? (
                <>
                  <path
                    d="M 33 46 Q 38 42 43 46"
                    stroke="#1f2937"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 57 46 Q 62 42 67 46"
                    stroke="#1f2937"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <>
                  <ellipse cx="38" cy="46" rx="4.5" ry="5.5" fill="#047857" />
                  <circle cx="39.5" cy="44.5" r="1.5" fill="#ffffff" />
                  <ellipse cx="62" cy="46" rx="4.5" ry="5.5" fill="#047857" />
                  <circle cx="63.5" cy="44.5" r="1.5" fill="#ffffff" />
                </>
              )}

              {/* Whiskers */}
              <line
                x1="22"
                y1="54"
                x2="34"
                y2="56"
                stroke="#78716c"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="20"
                y1="60"
                x2="34"
                y2="60"
                stroke="#78716c"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="78"
                y1="54"
                x2="66"
                y2="56"
                stroke="#78716c"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="80"
                y1="60"
                x2="66"
                y2="60"
                stroke="#78716c"
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              {/* Nose & Mouth */}
              <polygon points="48,55 52,55 50,58" fill="#f43f5e" />
              {mouthOpen ? (
                <ellipse cx="50" cy="64" rx="4" ry="3.5" fill="#be123c" />
              ) : (
                <path
                  d="M 44 60 Q 50 63 50 60 Q 50 63 56 60"
                  stroke="#1f2937"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              )}
            </svg>
          )}

          {/* 5. BUNNY MASCOT (Luna Moon Rabbit) */}
          {type === 'bunny' && (
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow">
              {/* Long Bunny Ears */}
              <ellipse
                cx="34"
                cy="22"
                rx="9"
                ry="20"
                fill="#f1f5f9"
                stroke="#cbd5e1"
                strokeWidth="1.5"
                transform="rotate(-12 34 22)"
              />
              <ellipse
                cx="34"
                cy="22"
                rx="5"
                ry="14"
                fill="#fbcfe8"
                transform="rotate(-12 34 22)"
              />

              <ellipse
                cx="66"
                cy="22"
                rx="9"
                ry="20"
                fill="#f1f5f9"
                stroke="#cbd5e1"
                strokeWidth="1.5"
                transform="rotate(12 66 22)"
              />
              <ellipse cx="66" cy="22" rx="5" ry="14" fill="#fbcfe8" transform="rotate(12 66 22)" />

              {/* Bunny Head */}
              <circle cx="50" cy="58" r="32" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />

              {/* Cheeks Blush */}
              <circle cx="28" cy="62" r="6" fill="#f472b6" opacity="0.35" />
              <circle cx="72" cy="62" r="6" fill="#f472b6" opacity="0.35" />

              {/* Eyes */}
              {isBlinking ? (
                <>
                  <path
                    d="M 33 54 Q 38 50 43 54"
                    stroke="#475569"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 57 54 Q 62 50 67 54"
                    stroke="#475569"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <>
                  <ellipse cx="38" cy="54" rx="4.5" ry="5.5" fill="#db2777" />
                  <circle cx="39.5" cy="52" r="1.8" fill="#ffffff" />
                  <ellipse cx="62" cy="54" rx="4.5" ry="5.5" fill="#db2777" />
                  <circle cx="63.5" cy="52" r="1.8" fill="#ffffff" />
                </>
              )}

              {/* Nose & Mouth */}
              <polygon points="48,63 52,63 50,66" fill="#ec4899" />
              {mouthOpen ? (
                <ellipse cx="50" cy="72" rx="4" ry="3.5" fill="#db2777" />
              ) : (
                <path
                  d="M 45 68 Q 50 71 50 68 Q 50 71 55 68"
                  stroke="#64748b"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              )}

              {/* Star Barrette Accessory */}
              <polygon
                points="68,40 70,44 75,44 71,47 73,51 68,48 64,51 66,47 62,44 67,44"
                fill="#fbbf24"
              />
            </svg>
          )}

          {/* 6. DRAGON MASCOT (Ignis Astral Dragon) */}
          {type === 'dragon' && (
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow">
              {/* Dragon Horns */}
              <path
                d="M 28 35 Q 16 15 24 8 Q 30 18 34 30 Z"
                fill="#d97706"
                stroke="#92400e"
                strokeWidth="1.5"
              />
              <path
                d="M 72 35 Q 84 15 76 8 Q 70 18 66 30 Z"
                fill="#d97706"
                stroke="#92400e"
                strokeWidth="1.5"
              />

              {/* Little Wings */}
              <polygon points="12,50 4,38 18,44" fill="#047857" stroke="#065f46" strokeWidth="1" />
              <polygon points="88,50 96,38 82,44" fill="#047857" stroke="#065f46" strokeWidth="1" />

              {/* Dragon Head */}
              <circle cx="50" cy="54" r="33" fill="#10b981" stroke="#059669" strokeWidth="2" />

              {/* Scaled Brow Crest */}
              <path d="M 38 28 Q 50 20 62 28 Q 50 24 38 28 Z" fill="#059669" />

              {/* Snout Belly */}
              <ellipse cx="50" cy="65" rx="20" ry="15" fill="#a7f3d0" />

              {/* Eyes */}
              {isBlinking ? (
                <>
                  <line
                    x1="33"
                    y1="46"
                    x2="43"
                    y2="46"
                    stroke="#064e3b"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <line
                    x1="57"
                    y1="46"
                    x2="67"
                    y2="46"
                    stroke="#064e3b"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </>
              ) : (
                <>
                  <circle cx="38" cy="46" r="5" fill="#f59e0b" />
                  <line
                    x1="38"
                    y1="42"
                    x2="38"
                    y2="50"
                    stroke="#064e3b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="62" cy="46" r="5" fill="#f59e0b" />
                  <line
                    x1="62"
                    y1="42"
                    x2="62"
                    y2="50"
                    stroke="#064e3b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </>
              )}

              {/* Nostrils */}
              <circle cx="45" cy="60" r="2" fill="#065f46" />
              <circle cx="55" cy="60" r="2" fill="#065f46" />

              {/* Mouth with flame ember when reading */}
              {mouthOpen ? (
                <>
                  <ellipse cx="50" cy="68" rx="6" ry="4" fill="#991b1b" />
                  <circle cx="50" cy="68" r="3" fill="#f97316" className="animate-ping" />
                </>
              ) : (
                <path
                  d="M 44 68 Q 50 72 56 68"
                  stroke="#065f46"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              )}
            </svg>
          )}
        </div>

        {/* Small Status Badge below Mascot */}
        <div className="mt-1.5 flex items-center space-x-1 bg-[#16161A]/90 backdrop-blur-md text-slate-200 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-white/10 shadow-md">
          {isPlaying && !isPaused ? (
            <>
              <Volume2 className="w-3 h-3 text-amber-400 animate-pulse" />
              <span className="text-amber-400">Reading</span>
            </>
          ) : isPaused ? (
            <>
              <VolumeX className="w-3 h-3 text-slate-400" />
              <span>Paused</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{mascotDetails[type]?.name || 'Companion'}</span>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default MascotWidget;

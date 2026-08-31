import React, { useState, useMemo } from 'react';
import {
  X,
  Volume2,
  Sliders,
  Type,
  Palette,
  Sparkles,
  Play,
  Save,
  Check,
  Search,
  Globe,
  Radio,
  Gauge,
  EyeOff,
  Eye,
  Activity,
} from 'lucide-react';
import {
  TTSSettings,
  TTSVoiceOption,
  ThemeMode,
  FontFamily,
  HighlightStyle,
  MascotType,
} from '../types';
import { THEMES, FONT_FAMILIES } from '../utils/themeStyles';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TTSSettings;
  voices: TTSVoiceOption[];
  onSaveSettings: (newSettings: TTSSettings) => void;
  onTestVoice: (voiceURI: string, rate: number, pitch: number, volume: number) => void;
}

const PREDEFINED_SPEEDS = [
  { value: 0.5, label: '0.5x', desc: 'Very Slow' },
  { value: 0.75, label: '0.75x', desc: 'Relaxed' },
  { value: 1.0, label: '1.0x', desc: 'Normal' },
  { value: 1.25, label: '1.25x', desc: 'Brisk' },
  { value: 1.5, label: '1.5x', desc: 'Fast' },
  { value: 1.75, label: '1.75x', desc: 'Speed' },
  { value: 2.0, label: '2.0x', desc: 'Double' },
  { value: 2.5, label: '2.5x', desc: 'Rapid' },
  { value: 3.0, label: '3.0x', desc: 'Max' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  voices,
  onSaveSettings,
  onTestVoice,
}) => {
  const [localSettings, setLocalSettings] = useState<TTSSettings>(settings);
  const [activeTab, setActiveTab] = useState<'voice' | 'reading' | 'mascot'>('voice');
  const [voiceSearch, setVoiceSearch] = useState('');
  const [selectedLangFilter, setSelectedLangFilter] = useState<string>('all');
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  // Synchronize local settings when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  // Extract unique languages for tabs/filter
  const languageCategories = useMemo(() => {
    const langMap = new Map<string, { code: string; label: string; count: number }>();

    voices.forEach((v) => {
      const code = v.lang.substring(0, 2).toLowerCase();
      let label = code.toUpperCase();
      if (code === 'vi') label = 'Vietnamese (Tiếng Việt)';
      else if (code === 'en') label = 'English';
      else if (code === 'ja') label = 'Japanese (日本語)';
      else if (code === 'fr') label = 'French (Français)';
      else if (code === 'es') label = 'Spanish (Español)';
      else if (code === 'de') label = 'German (Deutsch)';
      else if (code === 'zh') label = 'Chinese (中文)';
      else if (code === 'ko') label = 'Korean (한국어)';
      else if (code === 'it') label = 'Italian (Italiano)';

      if (!langMap.has(code)) {
        langMap.set(code, { code, label, count: 1 });
      } else {
        langMap.get(code)!.count += 1;
      }
    });

    const list = Array.from(langMap.values());
    list.sort((a, b) => {
      if (a.code === 'vi') return -1;
      if (b.code === 'vi') return 1;
      if (a.code === 'en') return -1;
      if (b.code === 'en') return 1;
      return a.label.localeCompare(b.label);
    });

    return list;
  }, [voices]);

  // Filtered voice list
  const filteredVoices = useMemo(() => {
    return voices.filter((v) => {
      const matchesSearch =
        v.name.toLowerCase().includes(voiceSearch.toLowerCase()) ||
        v.lang.toLowerCase().includes(voiceSearch.toLowerCase());

      const matchesLang =
        selectedLangFilter === 'all' ||
        v.lang.toLowerCase().startsWith(selectedLangFilter.toLowerCase());

      return matchesSearch && matchesLang;
    });
  }, [voices, voiceSearch, selectedLangFilter]);

  const handleSave = () => {
    onSaveSettings(localSettings);
    setShowSavedFeedback(true);
    setTimeout(() => {
      setShowSavedFeedback(false);
      onClose();
    }, 500);
  };

  const handleTestCurrentVoice = () => {
    onTestVoice(
      localSettings.voiceURI,
      localSettings.rate,
      localSettings.pitch,
      localSettings.volume
    );
  };

  if (!isOpen) return null;

  return (
    <div
      id="tts-settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in select-none"
    >
      <div
        id="tts-settings-modal"
        className="w-full max-w-2xl bg-[#0D0D0F] text-slate-200 rounded-3xl shadow-2xl border border-white/10 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#16161A]">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Voice & Reader Settings</h2>
              <p className="text-xs text-slate-400">
                Speed presets, speech engine, typography, and mascot companion
              </p>
            </div>
          </div>
          <button
            id="close-settings-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex px-6 pt-3 border-b border-white/10 gap-2 bg-[#0A0A0B]">
          <button
            id="tab-voice-settings"
            onClick={() => setActiveTab('voice')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center space-x-2 transition-colors border-b-2 ${
              activeTab === 'voice'
                ? 'border-amber-500 text-amber-400 bg-[#16161A]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>Voice & Speed</span>
          </button>

          <button
            id="tab-reading-settings"
            onClick={() => setActiveTab('reading')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center space-x-2 transition-colors border-b-2 ${
              activeTab === 'reading'
                ? 'border-amber-500 text-amber-400 bg-[#16161A]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Typography & Theme</span>
          </button>

          <button
            id="tab-mascot-settings"
            onClick={() => setActiveTab('mascot')}
            className={`px-4 py-2.5 rounded-t-xl text-xs font-semibold flex items-center space-x-2 transition-colors border-b-2 ${
              activeTab === 'mascot'
                ? 'border-amber-500 text-amber-400 bg-[#16161A]'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Mascot & Animations</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: VOICE & SPEED */}
          {activeTab === 'voice' && (
            <div className="space-y-6">
              {/* READING SPEED SECTION WITH PREDEFINED RADIO OPTIONS + DROPDOWN + SLIDER */}
              <div className="p-4 rounded-2xl bg-[#16161A] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Gauge className="w-4 h-4 text-amber-500" />
                    <div>
                      <span className="text-sm font-bold text-white">Reading Speed (TTS Rate)</span>
                      <span className="text-xs text-slate-400 ml-2">Choose preset or fine-tune</span>
                    </div>
                  </div>

                  {/* Dropdown Complement Selector */}
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400 font-mono">Preset:</span>
                    <select
                      id="tts-speed-preset-dropdown"
                      value={
                        PREDEFINED_SPEEDS.some((p) => Math.abs(p.value - localSettings.rate) < 0.01)
                          ? localSettings.rate.toString()
                          : 'custom'
                      }
                      onChange={(e) => {
                        if (e.target.value !== 'custom') {
                          setLocalSettings({ ...localSettings, rate: parseFloat(e.target.value) });
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                    >
                      {PREDEFINED_SPEEDS.map((sp) => (
                        <option key={sp.value} value={sp.value} className="bg-[#16161A] text-white">
                          {sp.label} ({sp.desc})
                        </option>
                      ))}
                      {!PREDEFINED_SPEEDS.some((p) => Math.abs(p.value - localSettings.rate) < 0.01) && (
                        <option value="custom" className="bg-[#16161A] text-amber-400">
                          Custom ({localSettings.rate}x)
                        </option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Predefined Speed Radio Option Buttons */}
                <div className="space-y-1.5">
                  <div className="text-[11px] text-slate-400 uppercase font-mono tracking-wider">
                    Selectable Speed Radios:
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-1.5">
                    {PREDEFINED_SPEEDS.map((speedOption) => {
                      const isSelected = Math.abs(localSettings.rate - speedOption.value) < 0.01;
                      return (
                        <button
                          key={speedOption.value}
                          type="button"
                          id={`speed-radio-${speedOption.value}`}
                          onClick={() =>
                            setLocalSettings({ ...localSettings, rate: speedOption.value })
                          }
                          className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center cursor-pointer ${
                            isSelected
                              ? 'bg-amber-600 border-amber-500 text-black font-extrabold shadow-md shadow-amber-500/20 ring-2 ring-amber-500/40'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span className="text-xs font-mono">{speedOption.label}</span>
                          <span
                            className={`text-[9px] truncate tracking-tight ${
                              isSelected ? 'text-black/80 font-semibold' : 'text-slate-500'
                            }`}
                          >
                            {speedOption.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Fine-tune Slider */}
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">Fine-tune Slider:</span>
                    <span className="font-mono text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      {localSettings.rate.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    id="slider-tts-rate"
                    type="range"
                    min={0.5}
                    max={3.0}
                    step={0.05}
                    value={localSettings.rate}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, rate: parseFloat(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-white/20 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0.50x Min</span>
                    <span>1.00x Normal</span>
                    <span>2.00x Fast</span>
                    <span>3.00x Max</span>
                  </div>
                </div>
              </div>

              {/* Voice Selector Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-white flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-amber-500" />
                    <span>Select Speech Voice ({voices.length} detected)</span>
                  </label>
                  <button
                    id="test-voice-btn"
                    onClick={handleTestCurrentVoice}
                    className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-amber-500/30 cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-amber-300" />
                    <span>Test Voice</span>
                  </button>
                </div>

                {/* Voice Search & Language Filter Chips */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="voice-search-input"
                      type="text"
                      placeholder="Search voice name or language (e.g., Natural, Vietnamese, English, Google)..."
                      value={voiceSearch}
                      onChange={(e) => setVoiceSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Language filter quick chips */}
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto py-1">
                    <button
                      onClick={() => setSelectedLangFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        selectedLangFilter === 'all'
                          ? 'bg-amber-600 text-black font-bold'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({voices.length})
                    </button>
                    {languageCategories.map((cat) => (
                      <button
                        key={cat.code}
                        onClick={() => setSelectedLangFilter(cat.code)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          selectedLangFilter === cat.code
                            ? 'bg-amber-600 text-black font-bold'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {cat.label} ({cat.count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Voice Dropdown / Select List */}
                <div className="max-h-44 overflow-y-auto rounded-xl border border-white/10 bg-[#0A0A0B] p-1.5 space-y-1">
                  {filteredVoices.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500">
                      No voices found matching &quot;{voiceSearch}&quot;.
                    </div>
                  ) : (
                    filteredVoices.map((v) => {
                      const isSelected = localSettings.voiceURI === v.voiceURI;
                      return (
                        <div
                          key={v.voiceURI || v.name}
                          onClick={() => setLocalSettings({ ...localSettings, voiceURI: v.voiceURI })}
                          className={`p-2.5 rounded-lg flex items-center justify-between cursor-pointer text-xs transition-colors ${
                            isSelected
                              ? 'bg-white/10 border border-amber-500/60 text-white font-medium'
                              : 'hover:bg-white/5 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <Radio
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isSelected ? 'text-amber-500' : 'text-slate-600'
                              }`}
                            />
                            <div className="truncate">
                              <span className="font-semibold text-white">{v.name}</span>
                              <span className="ml-2 font-mono text-[11px] text-slate-500">
                                [{v.lang}]
                              </span>
                              {v.genderGuess !== 'Neutral' && (
                                <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] bg-white/10 text-slate-400">
                                  {v.genderGuess}
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLocalSettings({ ...localSettings, voiceURI: v.voiceURI });
                              onTestVoice(
                                v.voiceURI,
                                localSettings.rate,
                                localSettings.pitch,
                                localSettings.volume
                              );
                            }}
                            title="Preview this voice"
                            className="p-1 hover:bg-amber-500/30 rounded text-amber-400 shrink-0 ml-2"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Pitch & Volume Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                {/* Pitch Slider */}
                <div className="bg-[#16161A] p-3.5 rounded-2xl border border-white/10 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-white">Voice Pitch (Tone)</span>
                    <span className="font-mono text-amber-400 font-bold">{localSettings.pitch}</span>
                  </div>
                  <input
                    id="slider-tts-pitch"
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.1}
                    value={localSettings.pitch}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, pitch: parseFloat(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-white/20 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0.5 Deep</span>
                    <span>1.0 Normal</span>
                    <span>2.0 High</span>
                  </div>
                </div>

                {/* Volume Slider */}
                <div className="bg-[#16161A] p-3.5 rounded-2xl border border-white/10 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-white">Playback Volume</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {Math.round(localSettings.volume * 100)}%
                    </span>
                  </div>
                  <input
                    id="slider-tts-volume"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={localSettings.volume}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, volume: parseFloat(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-white/20 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Mute</span>
                    <span>50%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Highlight Style Choice */}
              <div className="space-y-2.5 pt-2 border-t border-white/10">
                <label className="text-sm font-semibold text-white flex items-center space-x-2">
                  <Palette className="w-4 h-4 text-amber-500" />
                  <span>Real-time Sentence Highlight Style</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'soft-gold', name: 'Soft Gold Glow', sample: 'bg-amber-300 text-neutral-900' },
                      { id: 'neon-glow', name: 'Neon Cyber Cyan', sample: 'bg-cyan-300 text-neutral-900' },
                      { id: 'emerald', name: 'Emerald Forest', sample: 'bg-emerald-300 text-neutral-900' },
                      { id: 'lilac', name: 'Lilac Dream', sample: 'bg-purple-300 text-neutral-900' },
                      { id: 'underlined', name: 'Clean Underline', sample: 'underline decoration-amber-400 decoration-2' },
                      { id: 'amber-box', name: 'Border Accent Box', sample: 'border-l-4 border-amber-500 pl-1' },
                    ] as { id: HighlightStyle; name: string; sample: string }[]
                  ).map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setLocalSettings({ ...localSettings, highlightStyle: style.id })}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                        localSettings.highlightStyle === style.id
                          ? 'border-amber-500 bg-white/10 text-white ring-1 ring-amber-500 font-medium'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="font-semibold mb-1">{style.name}</div>
                      <div className={`text-[11px] px-1.5 py-0.5 rounded font-serif ${style.sample}`}>
                        Sample highlight
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TYPOGRAPHY & THEME */}
          {activeTab === 'reading' && (
            <div className="space-y-6">
              {/* Theme Modes */}
              <div className="space-y-2.5">
                <label className="text-sm font-semibold text-white">Color Palette & Atmosphere</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(Object.keys(THEMES) as ThemeMode[]).map((themeKey) => {
                    const t = THEMES[themeKey];
                    const isSelected = localSettings.theme === themeKey;
                    return (
                      <button
                        key={themeKey}
                        onClick={() => setLocalSettings({ ...localSettings, theme: themeKey })}
                        className={`p-3 rounded-2xl border flex flex-col items-start space-y-2 transition-all ${
                          isSelected
                            ? 'border-amber-500 ring-2 ring-amber-500/40 bg-white/10'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-4 h-4 rounded-full border border-black/30"
                            style={{
                              backgroundColor:
                                themeKey === 'sepia'
                                  ? '#f4ecd8'
                                  : themeKey === 'light'
                                  ? '#ffffff'
                                  : themeKey === 'paper'
                                  ? '#ebe5d8'
                                  : themeKey === 'forest'
                                  ? '#14261f'
                                  : themeKey === 'midnight'
                                  ? '#0e1424'
                                  : '#0D0D0F',
                            }}
                          />
                          <span className="text-xs font-semibold text-white">{t.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {themeKey === 'sepia'
                            ? 'Warm paper & eye relief'
                            : themeKey === 'light'
                            ? 'High contrast daylight'
                            : themeKey === 'paper'
                            ? 'Bookish texture'
                            : themeKey === 'forest'
                            ? 'Botanical night'
                            : themeKey === 'midnight'
                            ? 'Deep OLED blue'
                            : 'Sophisticated Dark'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font Family Selection */}
              <div className="space-y-2.5 pt-3 border-t border-white/10">
                <label className="text-sm font-semibold text-white">Typography Pairing</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(Object.keys(FONT_FAMILIES) as FontFamily[]).map((fontKey) => {
                    const f = FONT_FAMILIES[fontKey];
                    const isSelected = localSettings.fontFamily === fontKey;
                    return (
                      <button
                        key={fontKey}
                        onClick={() => setLocalSettings({ ...localSettings, fontFamily: fontKey })}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-amber-500 bg-white/10 ring-1 ring-amber-500 text-white font-medium'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-sm font-bold" style={{ fontFamily: f.cssFamily }}>
                          {f.name}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">{f.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Font Size & Line Height Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/10">
                <div className="bg-[#16161A] p-3.5 rounded-2xl border border-white/10 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-white">Font Size</span>
                    <span className="font-mono text-amber-400 font-bold">{localSettings.fontSize}px</span>
                  </div>
                  <input
                    id="slider-font-size"
                    type="range"
                    min={14}
                    max={32}
                    step={1}
                    value={localSettings.fontSize}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, fontSize: parseInt(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-white/20 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>14px Compact</span>
                    <span>18px Standard</span>
                    <span>32px Extra Large</span>
                  </div>
                </div>

                <div className="bg-[#16161A] p-3.5 rounded-2xl border border-white/10 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-white">Line Height Spacing</span>
                    <span className="font-mono text-amber-400 font-bold">{localSettings.lineHeight}</span>
                  </div>
                  <input
                    id="slider-line-height"
                    type="range"
                    min={1.4}
                    max={2.4}
                    step={0.1}
                    value={localSettings.lineHeight}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, lineHeight: parseFloat(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-white/20 rounded-lg"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>1.4 Snug</span>
                    <span>1.8 Book standard</span>
                    <span>2.4 Relaxed</span>
                  </div>
                </div>
              </div>

              {/* Reader Width & Auto-Scroll Switches */}
              <div className="pt-3 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">Auto-scroll Active Sentence</div>
                    <div className="text-xs text-slate-400">
                      Smoothly scrolls viewport so reading sentence stays centered
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      setLocalSettings({ ...localSettings, autoScroll: !localSettings.autoScroll })
                    }
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      localSettings.autoScroll ? 'bg-amber-600' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-1 ${
                        localSettings.autoScroll ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: MASCOT & ANIMATIONS */}
          {activeTab === 'mascot' && (
            <div className="space-y-6">
              {/* Toggle Mascot Master Switch */}
              <div className="flex items-center justify-between bg-[#16161A] p-4 rounded-2xl border border-white/10">
                <div>
                  <div className="text-sm font-bold text-white flex items-center space-x-2">
                    {localSettings.mascotEnabled ? (
                      <Eye className="w-4 h-4 text-amber-500" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-slate-500" />
                    )}
                    <span>Enable Floating Mascot Companion</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {localSettings.mascotEnabled
                      ? 'Interactive reading companion with voice reactions and speech quotes'
                      : 'Disabled — Distraction-free mode with zero floating mascots'}
                  </div>
                </div>
                <button
                  id="toggle-mascot-switch"
                  onClick={() =>
                    setLocalSettings({ ...localSettings, mascotEnabled: !localSettings.mascotEnabled })
                  }
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                    localSettings.mascotEnabled ? 'bg-amber-600' : 'bg-white/10'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform transform absolute top-1 ${
                      localSettings.mascotEnabled ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Mascot Character Design Choice (6 Characters) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-white">Select Character Design (6 Archetypes)</label>
                  <span className="text-xs text-slate-400 font-mono">
                    Active: {localSettings.mascotType.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {(
                    [
                      { id: 'fox', name: 'Kitsune Fox', emoji: '🦊', desc: 'Curious & energetic novel guide' },
                      { id: 'owl', name: 'Barnaby Owl', emoji: '🦉', desc: 'Wise reading scholar with spectacles' },
                      { id: 'bot', name: 'Voxie-9 Bot', emoji: '🤖', desc: 'Cyber droid with audio equalizer face' },
                      { id: 'cat', name: 'Mochi Neko', emoji: '🐱', desc: 'Cozy kitten for bedtime stories' },
                      { id: 'bunny', name: 'Luna Bunny', emoji: '🐰', desc: 'Gentle moon rabbit with star talisman' },
                      { id: 'dragon', name: 'Astral Dragon', emoji: '🐲', desc: 'Mythical baby dragon with ember glow' },
                    ] as { id: MascotType; name: string; emoji: string; desc: string }[]
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      id={`select-mascot-${m.id}`}
                      onClick={() => setLocalSettings({ ...localSettings, mascotType: m.id })}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                        localSettings.mascotType === m.id
                          ? 'border-amber-500 bg-white/10 ring-2 ring-amber-500/40 text-white font-medium'
                          : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{m.emoji}</span>
                          <span className="font-bold text-xs text-white">{m.name}</span>
                        </div>
                        {localSettings.mascotType === m.id && (
                          <Check className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 mt-2">{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Granular Animation Toggles */}
              <div className="p-4 rounded-2xl bg-[#16161A] border border-white/10 space-y-3.5">
                <div className="flex items-center space-x-2 text-white font-semibold text-xs border-b border-white/10 pb-2">
                  <Activity className="w-4 h-4 text-amber-500" />
                  <span>Animation & Behavior Preferences</span>
                </div>

                {/* 1. Speech bounce */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-white">Active Speech Bouncing & Talking Recoil</div>
                    <div className="text-[11px] text-slate-400">Animated mouth motion and rhythmic badge pulse</div>
                  </div>
                  <button
                    onClick={() =>
                      setLocalSettings({
                        ...localSettings,
                        mascotBounceAnimation: !localSettings.mascotBounceAnimation,
                      })
                    }
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      localSettings.mascotBounceAnimation ? 'bg-amber-600' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                        localSettings.mascotBounceAnimation ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* 2. Eye blinking */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-white">Periodic Eye Blinking</div>
                    <div className="text-[11px] text-slate-400">Natural random eye blinking cycles</div>
                  </div>
                  <button
                    onClick={() =>
                      setLocalSettings({
                        ...localSettings,
                        mascotBlinkAnimation: !localSettings.mascotBlinkAnimation,
                      })
                    }
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      localSettings.mascotBlinkAnimation ? 'bg-amber-600' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                        localSettings.mascotBlinkAnimation ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* 3. Floating hover motion */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-white">Idle Floating Sway</div>
                    <div className="text-[11px] text-slate-400">Gentle vertical hovering bobbing animation</div>
                  </div>
                  <button
                    onClick={() =>
                      setLocalSettings({
                        ...localSettings,
                        mascotFloatingAnimation: !localSettings.mascotFloatingAnimation,
                      })
                    }
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      localSettings.mascotFloatingAnimation ? 'bg-amber-600' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                        localSettings.mascotFloatingAnimation ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* 4. Speech quote bubble */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-white">Speech Quote Bubble</div>
                    <div className="text-[11px] text-slate-400">Show dialog bubble with real-time novel quotes</div>
                  </div>
                  <button
                    onClick={() =>
                      setLocalSettings({
                        ...localSettings,
                        mascotSpeechBubble: !localSettings.mascotSpeechBubble,
                      })
                    }
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      localSettings.mascotSpeechBubble ? 'bg-amber-600' : 'bg-white/10'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform transform absolute top-0.5 ${
                        localSettings.mascotSpeechBubble ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#16161A]">
          <button
            onClick={() => setLocalSettings(settings)}
            className="px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Reset to Previous
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-tts-settings-btn"
              onClick={handleSave}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-black font-bold text-xs flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              {showSavedFeedback ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

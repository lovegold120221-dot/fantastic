"use client";

import { useUser } from "@/context/UserContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { PICKER_LANGUAGES } from "@/lib/languages";
import { SettingsIcon } from "@/app/session/[id]/room/icons";
import CameraPreview from "./CameraPreview";

type SettingsTab = "general" | "audio" | "video" | "translation";

const VOICES = [
  { id: "Orus", label: "Orus · Formal" },
  { id: "Aoede", label: "Aoede · Female" },
  { id: "Kore", label: "Kore" },
  { id: "Puck", label: "Puck" },
  { id: "Charon", label: "Charon" },
  { id: "Fenrir", label: "Fenrir" },
  { id: "Leda", label: "Leda" },
];

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "audio", label: "Audio" },
  { id: "video", label: "Video" },
  { id: "translation", label: "Translation" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { profile, loading, updateProfile } = useUser();
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Local form state
  const [name, setName] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [voice, setVoice] = useState("Orus");
  const [autoJoinAudio, setAutoJoinAudio] = useState(false);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [mirrorVideo, setMirrorVideo] = useState(true);
  const [cameraOffOnJoin, setCameraOffOnJoin] = useState(false);
  const [videoBackground, setVideoBackground] = useState("none");
  const [showCaptions, setShowCaptions] = useState(true);
  const [muteOriginalAudio, setMuteOriginalAudio] = useState(true);
  const [translateAudioPlayback, setTranslateAudioPlayback] = useState(true);

  useEffect(() => {
    if (profile) {
      const t = setTimeout(() => {
        setName(profile.name || "");
        setTheme(profile.theme || "dark");
        setDefaultLanguage(profile.default_language || "en");
        setVoice(profile.voice || "Orus");
        setAutoJoinAudio(profile.auto_join_audio ?? false);
        setNoiseSuppression(profile.noise_suppression ?? true);
        setMirrorVideo(profile.mirror_video ?? true);
        setCameraOffOnJoin(profile.camera_off_on_join ?? false);
        setVideoBackground(profile.video_background ?? "none");
        setShowCaptions(profile.show_captions ?? true);
        setMuteOriginalAudio(profile.mute_original_audio ?? true);
        setTranslateAudioPlayback(profile.translate_audio_playback ?? true);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [profile]);

  function markDirty() {
    if (!dirty) setDirty(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await updateProfile({
      name,
      theme,
      default_language: defaultLanguage,
      voice,
      auto_join_audio: autoJoinAudio,
      noise_suppression: noiseSuppression,
      mirror_video: mirrorVideo,
      camera_off_on_join: cameraOffOnJoin,
      video_background: videoBackground,
      show_captions: showCaptions,
      mute_original_audio: muteOriginalAudio,
      translate_audio_playback: translateAudioPlayback,
    });
    setSaving(false);
    setDirty(false);
  }

  if (loading) {
    return (
      <main className="settings-shell">
        <div className="settings-loading">Loading your settings...</div>
      </main>
    );
  }

  return (
    <main className="settings-shell" data-theme={theme}>
      {/* Header */}
      <header className="settings-topbar">
        <div className="settings-topbar-left">
          <span className="settings-brand-mark" aria-hidden />
          <span className="settings-brand">Orbit Meeting</span>
        </div>
        <div className="settings-topbar-center">
          <SettingsIcon />
          <h1>Settings</h1>
        </div>
        <div className="settings-topbar-right">
          <button
            className="settings-close-btn"
            onClick={() => router.back()}
            aria-label="Close settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      <div className="settings-layout">
        {/* Sidebar nav */}
        <nav className="settings-nav" aria-label="Settings categories">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`settings-nav-item${activeTab === tab.id ? " settings-nav-item--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <section className="settings-content">
          <form onSubmit={handleSave}>
            {activeTab === "general" && (
              <div className="settings-tab">
                <h2 className="settings-tab-title">General</h2>
                <p className="settings-tab-desc">Configure your profile and app preferences.</p>

                <div className="settings-field">
                  <label className="settings-label">Display Name</label>
                  <input
                    className="settings-input"
                    value={name}
                    onChange={(e) => { setName(e.target.value); markDirty(); }}
                    placeholder="Enter your name"
                    maxLength={40}
                  />
                </div>

                <div className="settings-field">
                  <label className="settings-label">Theme</label>
                  <select
                    className="settings-select"
                    value={theme}
                    onChange={(e) => { setTheme(e.target.value as "light" | "dark"); markDirty(); }}
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label className="settings-label">Language</label>
                  <select
                    className="settings-select"
                    value={defaultLanguage}
                    onChange={(e) => { setDefaultLanguage(e.target.value); markDirty(); }}
                  >
                    {PICKER_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {activeTab === "audio" && (
              <div className="settings-tab">
                <h2 className="settings-tab-title">Audio</h2>
                <p className="settings-tab-desc">Configure your microphone and audio preferences.</p>

                <div className="settings-toggle-row">
                  <div>
                    <span className="settings-label">Auto-join audio</span>
                    <p className="settings-hint">Automatically connect to audio when joining a meeting</p>
                  </div>
                  <label className="settings-switch">
                    <input
                      type="checkbox"
                      checked={autoJoinAudio}
                      onChange={(e) => { setAutoJoinAudio(e.target.checked); markDirty(); }}
                    />
                    <span className="settings-slider" />
                  </label>
                </div>

                <div className="settings-toggle-row">
                  <div>
                    <span className="settings-label">Background noise suppression</span>
                    <p className="settings-hint">Filter out background noise from your microphone</p>
                  </div>
                  <label className="settings-switch">
                    <input
                      type="checkbox"
                      checked={noiseSuppression}
                      onChange={(e) => { setNoiseSuppression(e.target.checked); markDirty(); }}
                    />
                    <span className="settings-slider" />
                  </label>
                </div>
              </div>
            )}

            {activeTab === "video" && (
              <div className="settings-tab">
                <h2 className="settings-tab-title">Video</h2>
                <p className="settings-tab-desc">Configure your camera, preview, and background effects.</p>

                {/* Live camera preview with backgrounds */}
                <CameraPreview
                  mirror={mirrorVideo}
                  onMirrorChange={setMirrorVideo}
                  background={videoBackground}
                  onBackgroundChange={setVideoBackground}
                  onDirty={markDirty}
                />

                <div className="settings-toggle-row">
                  <div>
                    <span className="settings-label">Turn off camera when joining</span>
                    <p className="settings-hint">Keep your camera off when you enter a meeting</p>
                  </div>
                  <label className="settings-switch">
                    <input
                      type="checkbox"
                      checked={cameraOffOnJoin}
                      onChange={(e) => { setCameraOffOnJoin(e.target.checked); markDirty(); }}
                    />
                    <span className="settings-slider" />
                  </label>
                </div>
              </div>
            )}

            {activeTab === "translation" && (
              <div className="settings-tab">
                <h2 className="settings-tab-title">Translation</h2>
                <p className="settings-tab-desc">Configure real-time translation preferences.</p>

                <div className="settings-field">
                  <label className="settings-label">Default target language</label>
                  <select
                    className="settings-select"
                    value={defaultLanguage}
                    onChange={(e) => { setDefaultLanguage(e.target.value); markDirty(); }}
                  >
                    {PICKER_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
                    ))}
                  </select>
                </div>

                <div className="settings-field">
                  <label className="settings-label">Translation voice</label>
                  <select
                    className="settings-select"
                    value={voice}
                    onChange={(e) => { setVoice(e.target.value); markDirty(); }}
                  >
                    {VOICES.map(v => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </div>

                <div className="settings-toggle-row">
                  <div>
                    <span className="settings-label">Show captions</span>
                    <p className="settings-hint">Display translated captions during meetings</p>
                  </div>
                  <label className="settings-switch">
                    <input
                      type="checkbox"
                      checked={showCaptions}
                      onChange={(e) => { setShowCaptions(e.target.checked); markDirty(); }}
                    />
                    <span className="settings-slider" />
                  </label>
                </div>

                <div className="settings-toggle-row">
                  <div>
                    <span className="settings-label">Mute original audio</span>
                    <p className="settings-hint">Silence the speaker&apos;s original language and only hear the translation</p>
                  </div>
                  <label className="settings-switch">
                    <input
                      type="checkbox"
                      checked={muteOriginalAudio}
                      onChange={(e) => { setMuteOriginalAudio(e.target.checked); markDirty(); }}
                    />
                    <span className="settings-slider" />
                  </label>
                </div>

                <div className="settings-toggle-row">
                  <div>
                    <span className="settings-label">Play translated audio</span>
                    <p className="settings-hint">Hear the translated speech through your speakers</p>
                  </div>
                  <label className="settings-switch">
                    <input
                      type="checkbox"
                      checked={translateAudioPlayback}
                      onChange={(e) => { setTranslateAudioPlayback(e.target.checked); markDirty(); }}
                    />
                    <span className="settings-slider" />
                  </label>
                </div>
              </div>
            )}

            <div className="settings-footer">
              <button
                className="settings-btn settings-btn-primary"
                type="submit"
                disabled={saving || !dirty}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                className="settings-btn settings-btn-ghost"
                type="button"
                onClick={() => router.back()}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

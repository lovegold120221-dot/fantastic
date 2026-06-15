"use client";

import { use, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PICKER_LANGUAGES } from "@/lib/languages";
import { useUser } from "@/context/UserContext";
import type { PermissionStatus } from "@/lib/permissions";
import {
  getPermissionStatus,
  requestPermission,
  isMobile,
  isIOS,
} from "@/lib/permissions";

const STORAGE_KEY_NAME = "lt.displayName";
const STORAGE_KEY_LANG = "lt.lang";

function getSessionItem(key: string) {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(key);
}

export default function PreFlightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { profile, updateProfile } = useUser();

  const [displayName, setDisplayName] = useState("");
  const [lang, setLang] = useState<string>("en");
  const [shareCopied, setShareCopied] = useState(false);
  const [micStatus, setMicStatus] = useState<PermissionStatus | "checking">("checking");
  const [camStatus, setCamStatus] = useState<PermissionStatus | "checking">("checking");

  // Hydrate from sessionStorage + profile after mount so server & client
  // first render are identical (prevents hydration mismatch on disabled attr).
  useEffect(() => {
    setTimeout(() => {
      const savedName = getSessionItem(STORAGE_KEY_NAME);
      const savedLang = getSessionItem(STORAGE_KEY_LANG);
      if (savedName) setDisplayName(savedName);
      if (savedLang) setLang(savedLang);
      if (!savedName && profile?.name) setDisplayName(profile.name);
      if (!savedLang && profile?.default_language) setLang(profile.default_language);
    }, 0);
  }, [profile]);

  // Detect current camera/mic permission status on mount
  useEffect(() => {
    (async () => {
      setMicStatus(await getPermissionStatus("microphone"));
      setCamStatus(await getPermissionStatus("camera"));
    })();
  }, []);

  const requestMic = useCallback(async () => {
    const status = await requestPermission("microphone");
    setMicStatus(status);
  }, []);

  const requestCam = useCallback(async () => {
    const status = await requestPermission("camera");
    setCamStatus(status);
  }, []);

  const requestAllMedia = useCallback(async () => {
    await Promise.all([requestMic(), requestCam()]);
  }, [requestMic, requestCam]);

  async function handleJoin() {
    if (!displayName.trim()) return;
    window.sessionStorage.setItem(STORAGE_KEY_NAME, displayName.trim());
    window.sessionStorage.setItem(STORAGE_KEY_LANG, lang);
    
    if (profile && (profile.name !== displayName.trim() || profile.default_language !== lang)) {
      updateProfile({ name: displayName.trim(), default_language: lang });
    }

    router.push(`/session/${id}/room`);
  }

  async function copyInviteLink() {
    const url = `${window.location.origin}/session/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      // ignored
    }
  }

  return (
    <div className="page page-centered">
      <div className="entry-panel panel-centered">
        <div className="auth-brand mb-24">
          <div className="auth-logo-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon-eburon.svg" alt="Eburon AI" className="auth-brand-logo" />
          </div>
          <span>Orbit Meeting</span>
        </div>
        <h1 className="display display-lg enter mb-8">
          Join the call
        </h1>
        <p
          className="body enter-d1 mb-32"
        >
          Pick your language — that&apos;s what you&apos;ll speak and what you&apos;ll
          hear everyone else in.
        </p>

        <div className="enter-d2 flex-col gap-20 mb-32">
          <label className="label block">
            Your name
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Jesse"
              autoFocus
              className="select-field mt-8 no-bg pr-16"
              maxLength={40}
            />
          </label>

          <label className="label block">
            Language
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="select-field mt-8"
            >
              {PICKER_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="enter-d3 flex-col gap-12">
          <button
            className="btn btn-dark"
            onClick={handleJoin}
            disabled={!displayName.trim()}
            id="join-btn"
          >
            Join the call
          </button>
          <button
            className="btn btn-outline"
            onClick={copyInviteLink}
          >
            {shareCopied ? "Link copied!" : "Copy invite link"}
          </button>
        </div>

        {/* Permission status indicators */}
        {(micStatus !== "checking" || camStatus !== "checking") && (
          <div className="permission-status mt-32">
            <p className="mono permission-status-label">Device Access</p>
            <div className="permission-status-row">
              <PermissionBadge
                kind="Microphone"
                status={micStatus}
                onRequest={requestMic}
              />
              <PermissionBadge
                kind="Camera"
                status={camStatus}
                onRequest={requestCam}
              />
              <PermissionBadge
                kind="Screen Share"
                status={
                  isIOS() ? "unsupported" : "prompt"
                }
                onRequest={async () => {}}
              />
            </div>
            {isIOS() && (
              <p className="permission-status-note">
                Screen sharing is not available on iOS. Share your screen from a desktop browser.
              </p>
            )}
            {!isMobile() && micStatus !== "granted" && (
              <p className="permission-status-note">
                Grant Microphone access to speak in the meeting.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Permission Badge Component ──────────────────────────────────────────

function PermissionBadge({
  kind,
  status,
  onRequest,
}: {
  kind: string;
  status: PermissionStatus | "checking";
  onRequest: () => void;
}) {
  if (status === "checking") {
    return (
      <div className="perm-badge">
        <span className="perm-badge-dot perm-badge-dot--pending" />
        <span className="perm-badge-label">{kind}</span>
        <span className="perm-badge-status">checking</span>
      </div>
    );
  }

  const granted = status === "granted";
  const unsupported = status === "unsupported";

  return (
    <button
      type="button"
      className={`perm-badge${granted ? " perm-badge--granted" : ""}${unsupported ? " perm-badge--unsupported" : ""}`}
      onClick={unsupported ? undefined : onRequest}
      disabled={unsupported}
      title={
        unsupported
          ? "Not available on this device"
          : granted
            ? "Permission granted"
            : `Tap to allow ${kind}`
      }
    >
      <span
        className={`perm-badge-dot${granted ? " perm-badge-dot--granted" : ""}${unsupported ? " perm-badge-dot--unsupported" : ""}`}
      />
      <span className="perm-badge-label">{kind}</span>
      <span className="perm-badge-status">
        {granted ? "on" : unsupported ? "unavailable" : "off"}
      </span>
    </button>
  );
}

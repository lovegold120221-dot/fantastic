"use client";

import { useMemo, useState } from "react";
import {
  useIsSpeaking,
  useLocalParticipant,
  useParticipantAttributes,
} from "@livekit/components-react";
import { Track, type LocalParticipant, type RemoteParticipant } from "livekit-client";
import { PARTICIPANT_LANG_ATTR } from "@/lib/config";
import { getLanguageByCode } from "@/lib/languages";
import {
  MicOffIcon,
  CamOffIcon,
  MicOnIcon,
  CamOnIcon,
} from "./icons";

type Tab = "all" | "speaking" | "raised";

// ── Icons ────────────────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function HandIcon() { return <span style={{ fontSize: 14 }}>✋</span>; }
function PinIcon() { return <span style={{ fontSize: 14 }}>📌</span>; }
function MoreIcon() { return <span style={{ fontSize: 16, lineHeight: 1 }}>⋯</span>; }
function SpeakerIconSvg() { return <span style={{ fontSize: 14 }}>🔊</span>; }

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────

export default function ParticipantsPanel({
  localParticipant,
  participants,
  myLang,
  isHost,
  roomName,
  onClose,
}: {
  localParticipant: LocalParticipant | undefined;
  participants: RemoteParticipant[];
  myLang: string;
  isHost: boolean;
  roomName: string;
  onClose: () => void;
}) {
  const { microphoneTrack, cameraTrack } = useLocalParticipant();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [showMoreFor, setShowMoreFor] = useState<string | null>(null);
  const [roomLocked, setRoomLocked] = useState(false);

  const micOn = !!microphoneTrack && !microphoneTrack.isMuted;
  const camOn = !!cameraTrack && cameraTrack.source === Track.Source.Camera && !cameraTrack.isMuted;

  // Collect per-participant state
  const rows = useMemo(() => {
    return participants.map((p) => ({
      identity: p.identity,
      name: p.name || p.identity,
      initial: (p.name || p.identity).slice(0, 1).toUpperCase(),
      lang: (p.attributes || {})[PARTICIPANT_LANG_ATTR],
      langInfo: getLanguageByCode((p.attributes || {})[PARTICIPANT_LANG_ATTR]),
      isSpeaking: false, // computed below per-row via hook
      micOn: Array.from(p.audioTrackPublications.values()).some(
        (pub) => pub.source === Track.Source.Microphone && !pub.isMuted
      ),
      camOn: Array.from(p.videoTrackPublications.values()).some(
        (pub) => pub.source === Track.Source.Camera && !pub.isMuted
      ),
      handRaised: (p.attributes || {}).orbit_hand === "raised",
      screenSharing: Array.from(p.trackPublications.values()).some(
        (pub) => pub.source === Track.Source.ScreenShare && !pub.isMuted
      ),
      participant: p,
    }));
  }, [participants]);

  // Filter by tab
  const speakingParticipants = participants.filter((p) => {
    // Check via track activity
    return Array.from(p.audioTrackPublications.values()).some(
      (pub) => pub.source === Track.Source.Microphone && !pub.isMuted && pub.track
    );
  });

  const filtered = useMemo(() => {
    let list = rows;
    if (activeTab === "speaking") {
      list = list.filter((r) => speakingParticipants.some((sp) => sp.identity === r.identity));
    } else if (activeTab === "raised") {
      list = list.filter((r) => r.handRaised);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    return list;
  }, [rows, activeTab, search, speakingParticipants]);

  const totalCount = participants.length + 1;
  const raisedCount = rows.filter((r) => r.handRaised).length;

  // Sort: speaking first, then raised hands, then rest
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aSpeaking = speakingParticipants.some((sp) => sp.identity === a.identity);
      const bSpeaking = speakingParticipants.some((sp) => sp.identity === b.identity);
      if (aSpeaking && !bSpeaking) return -1;
      if (!aSpeaking && bSpeaking) return 1;
      if (a.handRaised && !b.handRaised) return -1;
      if (!a.handRaised && b.handRaised) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [filtered, speakingParticipants]);

  const displayName = localParticipant?.name || localParticipant?.identity || "You";
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="sidebar-panel">
      {/* Header */}
      <div className="sidebar-header">
        <span>Participants ({totalCount})</span>
        <button className="sidebar-close" onClick={onClose} aria-label="Close Participants">
          <CloseIcon />
        </button>
      </div>

      {/* Search */}
      <div className="pp-search-wrap">
        <span className="pp-search-icon"><SearchIcon /></span>
        <input
          className="pp-search-input"
          placeholder="Search participants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search participants"
        />
      </div>

      {/* Tabs */}
      <div className="pp-tabs">
        <button className={`pp-tab ${activeTab === "all" ? "pp-tab--active" : ""}`} onClick={() => setActiveTab("all")}>All</button>
        <button className={`pp-tab ${activeTab === "speaking" ? "pp-tab--active" : ""}`} onClick={() => setActiveTab("speaking")}>Speaking</button>
        <button className={`pp-tab ${activeTab === "raised" ? "pp-tab--active" : ""}`} onClick={() => setActiveTab("raised")}>
          Raised{raisedCount > 0 ? ` (${raisedCount})` : ""}
        </button>
      </div>

      <div className="sidebar-body">
        {/* Host controls */}
        {isHost && (
          <HostControls roomLocked={roomLocked} onToggleLock={() => setRoomLocked((v) => !v)} roomName={roomName} />
        )}

        {/* Self row */}
        <SelfRow
          name={displayName}
          initial={initial}
          micOn={micOn}
          camOn={camOn}
          onToggleMic={() => localParticipant?.setMicrophoneEnabled(!micOn)}
          onToggleCam={() => localParticipant?.setCameraEnabled(!camOn)}
          onRaiseHand={() => {
            const current = localParticipant?.attributes?.orbit_hand === "raised";
            localParticipant?.setAttributes({ orbit_hand: current ? "" : "raised" });
          }}
          handRaised={localParticipant?.attributes?.orbit_hand === "raised"}
        />

        {/* Participant list */}
        {sorted.length === 0 && (
          <div className="pp-empty">
            {search ? "No matching participants" : activeTab === "raised" ? "No raised hands" : "No participants yet"}
          </div>
        )}
        {sorted.map((row) => (
          <ParticipantRow
            key={row.identity}
            {...row}
            isHost={isHost}
            roomName={roomName}
            showMore={showMoreFor === row.identity}
            onToggleMore={() => setShowMoreFor(showMoreFor === row.identity ? null : row.identity)}
            myLang={myLang}
          />
        ))}
      </div>
    </div>
  );
}

// ── Host Controls ─────────────────────────────────────────────────────

function HostControls({
  roomLocked,
  onToggleLock,
  roomName,
}: {
  roomLocked: boolean;
  onToggleLock: () => void;
  roomName: string;
}) {
  async function handleMuteAll() {
    try {
      await fetch("/api/moderate", {
        method: "POST",
        body: JSON.stringify({ action: "muteAll", roomName }),
      });
    } catch {
      alert("Failed to mute all participants");
    }
  }

  return (
    <div className="pp-host-controls">
      <button className="pp-host-btn" onClick={handleMuteAll} title="Mute all participants">
        <MicOffIcon /> <span>Mute All</span>
      </button>
      <button className={`pp-host-btn ${roomLocked ? "pp-host-btn--active" : ""}`} onClick={onToggleLock} title={roomLocked ? "Unlock room" : "Lock room"}>
        <span>{roomLocked ? "🔒" : "🔓"}</span> <span>{roomLocked ? "Locked" : "Lock"}</span>
      </button>
      <button
        className="pp-host-btn"
        onClick={async () => {
          await navigator.clipboard.writeText(`${window.location.origin}/session/${roomName}`);
          alert("Meeting link copied!");
        }}
        title="Copy invite link"
      >
        <span>📋</span> <span>Invite</span>
      </button>
    </div>
  );
}

// ── Self Row ──────────────────────────────────────────────────────────

function SelfRow({
  name,
  initial,
  micOn,
  camOn,
  onToggleMic,
  onToggleCam,
  onRaiseHand,
  handRaised,
}: {
  name: string;
  initial: string;
  micOn: boolean;
  camOn: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onRaiseHand: () => void;
  handRaised: boolean;
}) {
  return (
    <div className="pp-self">
      <div className="pp-self-top">
        <div className="pp-avatar">{initial}</div>
        <div className="pp-self-info">
          <span className="pp-name">{name}</span>
          <span className="pp-role-tag">You</span>
        </div>
        <div className="pp-self-indicators">
          <span className={`pp-indicator ${micOn ? "pp-indicator--on" : "pp-indicator--off"}`} title={micOn ? "Mic on" : "Mic off"}>
            {micOn ? <MicOnIcon /> : <MicOffIcon />}
          </span>
          <span className={`pp-indicator ${camOn ? "pp-indicator--on" : "pp-indicator--off"}`} title={camOn ? "Camera on" : "Camera off"}>
            {camOn ? <CamOnIcon /> : <CamOffIcon />}
          </span>
        </div>
      </div>
      <div className="pp-self-actions">
        <button className={`pp-action-btn ${!micOn ? "pp-action-btn--warning" : ""}`} onClick={onToggleMic}>
          {micOn ? "Mute" : "Unmute"}
        </button>
        <button className={`pp-action-btn ${!camOn ? "pp-action-btn--warning" : ""}`} onClick={onToggleCam}>
          {camOn ? "Camera Off" : "Camera On"}
        </button>
        <button className={`pp-action-btn ${handRaised ? "pp-action-btn--active" : ""}`} onClick={onRaiseHand}>
          <HandIcon /> {handRaised ? "Lower" : "Raise"}
        </button>
      </div>
    </div>
  );
}

// ── Participant Row ───────────────────────────────────────────────────

function ParticipantRow({
  identity,
  name,
  initial,
  lang,
  langInfo,
  micOn,
  camOn,
  handRaised,
  screenSharing,
  participant,
  isHost,
  roomName,
  showMore,
  onToggleMore,
  myLang,
}: {
  identity: string;
  name: string;
  initial: string;
  lang?: string;
  langInfo?: ReturnType<typeof getLanguageByCode>;
  micOn: boolean;
  camOn: boolean;
  handRaised: boolean;
  screenSharing: boolean;
  participant: RemoteParticipant;
  isHost: boolean;
  roomName: string;
  showMore: boolean;
  onToggleMore: () => void;
  myLang: string;
}) {
  const isSpeaking = useIsSpeaking(participant);
  const needsTranslation = myLang !== "none" && !!lang && lang !== myLang;

  // Build status text
  const statusParts: string[] = [];
  if (isSpeaking) statusParts.push("Speaking now");
  if (screenSharing) statusParts.push("Screen sharing");
  const status = statusParts.join(" · ") || "";

  async function doModerate(action: string) {
    try {
      const res = await fetch("/api/moderate", {
        method: "POST",
        body: JSON.stringify({ action, roomName, identity }),
      });
      if (!res.ok) throw new Error("Moderation failed");
    } catch {
      alert(`Failed to ${action} participant`);
    }
  }

  return (
    <div className={`pp-row ${isSpeaking ? "pp-row--speaking" : ""} ${showMore ? "pp-row--expanded" : ""}`}>
      {/* Main row content */}
      <div className="pp-row-main" onClick={onToggleMore}>
        <div className={`pp-row-avatar ${isSpeaking ? "pp-row-avatar--speaking" : ""}`}>
          {initial}
        </div>
        <div className="pp-row-info">
          <div className="pp-row-name-row">
            <span className="pp-name">{name}</span>
            <span className="pp-badge pp-badge--role">Host</span>
            {langInfo && (
              <span className="pp-badge pp-badge--lang" title={langInfo.name}>
                {langInfo.flag} {needsTranslation ? `→ ${myLang.toUpperCase()}` : langInfo.code.toUpperCase()}
              </span>
            )}
          </div>
          {status && <div className="pp-row-status">{status}</div>}
          <div className="pp-row-icons">
            <span className={`pp-icon-dot ${micOn ? "pp-icon-dot--on" : "pp-icon-dot--off"}`} title={micOn ? "Mic on" : "Mic off"}>
              {micOn ? "🎤" : "🔇"}
            </span>
            <span className={`pp-icon-dot ${camOn ? "pp-icon-dot--on" : "pp-icon-dot--off"}`} title={camOn ? "Camera on" : "Camera off"}>
              {camOn ? "📷" : "📷̵"}
            </span>
            {handRaised && <span className="pp-icon-dot pp-icon-dot--hand" title="Hand raised"><HandIcon /></span>}
            {screenSharing && <span className="pp-icon-dot pp-icon-dot--screen" title="Screen sharing">🖥</span>}
          </div>
        </div>
        <button className="pp-row-more" onClick={(e) => { e.stopPropagation(); onToggleMore(); }} aria-label="More actions">
          <MoreIcon />
        </button>
      </div>

      {/* More menu */}
      {showMore && (
        <div className="pp-more-menu">
          {isHost ? (
            <>
              <button className="pp-more-item" onClick={() => doModerate("mute")}>🔇 Mute</button>
              <button className="pp-more-item" onClick={() => doModerate("unmute")}>🎤 Request Unmute</button>
              <button className="pp-more-item" onClick={() => doModerate("cameraOff")}>📷 Turn Off Camera</button>
              <button className="pp-more-item" onClick={() => doModerate("kick")}>✕ Remove from Room</button>
            </>
          ) : (
            <>
              <button className="pp-more-item" onClick={() => { /* pin locally */ }}><PinIcon /> Pin for Me</button>
              <button className="pp-more-item" onClick={() => { /* message */ }}>💬 Send Message</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

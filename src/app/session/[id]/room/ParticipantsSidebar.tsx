"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import {
  useIsSpeaking,
  useLocalParticipant,
  useRoomContext,
} from "@livekit/components-react";
import {
  Track,
  Room,
  type LocalParticipant,
  type RemoteParticipant,
} from "livekit-client";
import { PARTICIPANT_LANG_ATTR } from "@/lib/config";
import { getLanguageByCode } from "@/lib/languages";
import {
  MicOnIcon,
  MicOffIcon,
  CamOnIcon,
  CamOffIcon,
  HandRaiseIcon,
  PinIcon,
  SearchIcon,
  LockIcon,
  UnlockIcon,
  InviteIcon,
  MoreVerticalIcon,
  ScreenShareOnIcon,
  GridViewIcon,
  LeaveIcon,
  SettingsIcon,
  PersonIcon,
  ChatIcon,
} from "./icons";

// ── Types ────────────────────────────────────────────────────────────

type Tab = "all" | "speaking" | "raised";
type ViewMode = "list" | "video";

interface ParticipantRow {
  identity: string;
  name: string;
  initial: string;
  lang: string | undefined;
  micOn: boolean;
  camOn: boolean;
  handRaised: boolean;
  screenSharing: boolean;
  isSpeaking: boolean;
  participant: RemoteParticipant;
}

interface SidebarProps {
  localParticipant: LocalParticipant | undefined;
  participants: RemoteParticipant[];
  myLang: string;
  isHost: boolean;
  roomName: string;
  whoIsSpeakingParticipantId: string | null;
  onClose: () => void;
  onLeave?: () => void;
}

// ── Icons ────────────────────────────────────────────────────────────

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ListViewIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function SpeakIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

// ── Sidebar width detection hook ─────────────────────────────────────

function useSidebarWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

// ── Main Panel ───────────────────────────────────────────────────────

export default function ParticipantsSidebar({
  localParticipant,
  participants,
  myLang,
  isHost,
  roomName,
  whoIsSpeakingParticipantId,
  onClose,
  onLeave,
}: SidebarProps) {
  const { microphoneTrack, cameraTrack } = useLocalParticipant();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [roomLocked, setRoomLocked] = useState(false);
  const { ref: sidebarRef, width: sidebarWidth } = useSidebarWidth();

  const micOn = !!microphoneTrack && !microphoneTrack.isMuted;
  const camOn = !!cameraTrack && !cameraTrack.isMuted;
  const handRaised = localParticipant?.attributes?.orbit_hand === "raised";

  // ── Derive rows from remote participants ────────────────────────

  const rows = useMemo<ParticipantRow[]>(() => {
    return participants.map((p) => ({
      identity: p.identity,
      name: p.name || p.identity,
      initial: (p.name || p.identity).slice(0, 1).toUpperCase(),
      lang: (p.attributes || {})[PARTICIPANT_LANG_ATTR],
      micOn: Array.from(p.audioTrackPublications.values()).some(
        (pub) => pub.source === Track.Source.Microphone && !pub.isMuted,
      ),
      camOn: Array.from(p.videoTrackPublications.values()).some(
        (pub) => pub.source === Track.Source.Camera && !pub.isMuted,
      ),
      handRaised: (p.attributes || {}).orbit_hand === "raised",
      screenSharing: Array.from(p.trackPublications.values()).some(
        (pub) => pub.source === Track.Source.ScreenShare && !pub.isMuted,
      ),
      isSpeaking: p.identity === whoIsSpeakingParticipantId,
      participant: p,
    }));
  }, [participants, whoIsSpeakingParticipantId]);

  // ── Filter + Sort ─────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = rows;
    if (activeTab === "speaking") list = list.filter((r) => r.isSpeaking);
    else if (activeTab === "raised") list = list.filter((r) => r.handRaised);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((r) => r.name.toLowerCase().includes(q));
    }
    return list;
  }, [rows, activeTab, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      // Speaking participants first
      if (a.isSpeaking && !b.isSpeaking) return -1;
      if (!a.isSpeaking && b.isSpeaking) return 1;
      // Raised hands next
      if (a.handRaised && !b.handRaised) return -1;
      if (!a.handRaised && b.handRaised) return 1;
      // Alphabetical
      return a.name.localeCompare(b.name);
    });
  }, [filtered]);

  const totalCount = participants.length + 1; // include self
  const raisedCount = rows.filter((r) => r.handRaised).length;
  const showOnlyYou = participants.length === 0;

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="sidebar-panel ps-panel" ref={sidebarRef}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="sidebar-header ps-header">
        <div className="sidebar-header-left">
          <span>Participants ({totalCount})</span>
        </div>
        <div className="sidebar-header-right">
          <button
            className={`ps-view-btn ${viewMode === "list" ? "ps-view-btn--active" : ""}`}
            onClick={() => setViewMode("list")}
            title="List view"
            aria-label="List view"
          >
            <ListViewIcon />
          </button>
          <button
            className={`ps-view-btn ${viewMode === "video" ? "ps-view-btn--active" : ""}`}
            onClick={() => setViewMode("video")}
            title="Grid view"
            aria-label="Grid view"
          >
            <GridViewIcon />
          </button>
          <button className="sidebar-close" onClick={onClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>
      </div>

      {/* ── Search ──────────────────────────────────────────────── */}
      <div className="ps-search-wrap">
        <span className="ps-search-icon"><SearchIcon /></span>
        <input
          className="ps-search-input"
          placeholder="Search participants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div className="ps-tabs">
        <button
          className={`ps-tab ${activeTab === "all" ? "ps-tab--active" : ""}`}
          onClick={() => setActiveTab("all")}
        >
          All
        </button>
        <button
          className={`ps-tab ${activeTab === "speaking" ? "ps-tab--active" : ""}`}
          onClick={() => setActiveTab("speaking")}
        >
          Speaking
        </button>
        <button
          className={`ps-tab ${activeTab === "raised" ? "ps-tab--active" : ""}`}
          onClick={() => setActiveTab("raised")}
        >
          Raised{raisedCount > 0 ? ` (${raisedCount})` : ""}
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="sidebar-body ps-body">
        {/* Host room-level controls */}
        {isHost && (
          <HostControls
            roomLocked={roomLocked}
            onToggleLock={() => setRoomLocked((v) => !v)}
            roomName={roomName}
          />
        )}

        {/* Current user */}
        <CurrentUserCard
          name={localParticipant?.name || localParticipant?.identity || "You"}
          initial={(localParticipant?.name || localParticipant?.identity || "Y").slice(0, 1).toUpperCase()}
          micOn={micOn}
          camOn={camOn}
          handRaised={handRaised}
          isHost={isHost}
          isSpeaking={localParticipant?.isSpeaking ?? false}
          onLeave={onLeave}
          onToggleMic={() => localParticipant?.setMicrophoneEnabled(!micOn)}
          onToggleCam={() => localParticipant?.setCameraEnabled(!camOn)}
          onToggleHand={() => {
            const cur = localParticipant?.attributes?.orbit_hand === "raised";
            localParticipant?.setAttributes({ orbit_hand: cur ? "" : "raised" });
          }}
        />

        {/* Only you are here — when self is the only participant */}
        {showOnlyYou && !search && activeTab === "all" && (
          <div className="ps-only-you">
            <PersonIcon />
            <span>Only you are here</span>
          </div>
        )}

        {/* Empty state for filters */}
        {sorted.length === 0 && !showOnlyYou && (
          <div className="ps-empty">
            {search
              ? "No matching participants"
              : activeTab === "raised"
                ? "No raised hands"
                : activeTab === "speaking"
                  ? "No one is speaking"
                  : "No participants yet"}
          </div>
        )}

        {/* List View */}
        {viewMode === "list" && sorted.length > 0 && (
          <div className="ps-list">
            {sorted.map((row) => (
              <ListRow
                key={row.identity}
                row={row}
                isHost={isHost}
                roomName={roomName}
                myLang={myLang}
              />
            ))}
          </div>
        )}

        {/* Video / Grid View */}
        {viewMode === "video" && sorted.length > 0 && (
          <div
            className="ps-grid"
            style={{
              gridTemplateColumns: sidebarWidth >= 380 ? "1fr 1fr" : "1fr",
            }}
          >
            {sorted.map((row) => (
              <VideoCard
                key={row.identity}
                row={row}
                isHost={isHost}
                roomName={roomName}
                myLang={myLang}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Host Controls ────────────────────────────────────────────────────

function HostControls({
  roomLocked,
  onToggleLock,
  roomName,
}: {
  roomLocked: boolean;
  onToggleLock: () => void;
  roomName: string;
}) {
  return (
    <div className="ps-host-controls">
      <button
        className="ps-host-btn"
        onClick={async () => {
          try {
            await fetch("/api/moderate", {
              method: "POST",
              body: JSON.stringify({ action: "muteAll", roomName }),
            });
          } catch {
            alert("Failed to mute all");
          }
        }}
      >
        <MicOffIcon /> <span>Mute All</span>
      </button>
      <button
        className={`ps-host-btn ${roomLocked ? "ps-host-btn--active" : ""}`}
        onClick={onToggleLock}
      >
        {roomLocked ? <LockIcon /> : <UnlockIcon />}
        <span>{roomLocked ? "Locked" : "Lock"}</span>
      </button>
      <button
        className="ps-host-btn"
        onClick={async () => {
          await navigator.clipboard.writeText(
            `${window.location.origin}/session/${roomName}`,
          );
          alert("Meeting link copied!");
        }}
      >
        <InviteIcon /> <span>Invite</span>
      </button>
    </div>
  );
}

// ── Current User Card ────────────────────────────────────────────────

function CurrentUserCard({
  name,
  initial,
  micOn,
  camOn,
  handRaised,
  isHost,
  isSpeaking,
  onLeave,
  onToggleMic,
  onToggleCam,
  onToggleHand,
}: {
  name: string;
  initial: string;
  micOn: boolean;
  camOn: boolean;
  handRaised: boolean;
  isHost: boolean;
  isSpeaking: boolean;
  onLeave?: () => void;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleHand: () => void;
}) {
  const room = useRoomContext();

  const handleRename = useCallback(() => {
    const newName = prompt("Enter a new display name:", name);
    if (newName && newName.trim()) {
      room.localParticipant?.setName(newName.trim());
    }
  }, [name, room]);

  return (
    <div className={`ps-self ${isSpeaking ? "ps-self--speaking" : ""}`}>
      <div className="ps-self-row">
        <div className={`ps-self-avatar ${isSpeaking ? "ps-self-avatar--speaking" : ""}`}>
          {initial}
        </div>
        <div className="ps-self-info">
          <div className="ps-self-name-row">
            <span className="ps-name">{name}</span>
            <span className="ps-role-tag">YOU</span>
            {isHost && <span className="ps-badge ps-badge--host">Host</span>}
            {isSpeaking && <span className="ps-speaking-dot" title="Speaking" />}
          </div>
          <div className="ps-self-status">
            {micOn ? "Mic on" : "Mic muted"}
            {" · "}
            {camOn ? "Camera on" : "Camera off"}
            {handRaised && " · Hand raised"}
          </div>
        </div>
      </div>
      <div className="ps-self-actions">
        <button
          className={`ps-action-icon${!micOn ? " ps-action-icon--warn" : ""}`}
          onClick={onToggleMic}
          title={micOn ? "Mute" : "Unmute"}
          aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
        >
          {micOn ? <MicOnIcon /> : <MicOffIcon />}
        </button>
        <button
          className={`ps-action-icon${!camOn ? " ps-action-icon--warn" : ""}`}
          onClick={onToggleCam}
          title={camOn ? "Turn camera off" : "Turn camera on"}
          aria-label={camOn ? "Turn camera off" : "Turn camera on"}
        >
          {camOn ? <CamOnIcon /> : <CamOffIcon />}
        </button>
        <button
          className={`ps-action-icon${handRaised ? " ps-action-icon--active" : ""}`}
          onClick={onToggleHand}
          title={handRaised ? "Lower hand" : "Raise hand"}
          aria-label={handRaised ? "Lower hand" : "Raise hand"}
        >
          <HandRaiseIcon />
        </button>
        <div className="ps-self-more">
          <MoreMenu
            trigger={
              <button className="ps-action-icon" title="More" aria-label="More options">
                <MoreVerticalIcon />
              </button>
            }
            items={[
              {
                label: "Rename",
                icon: <PersonIcon />,
                onClick: handleRename,
              },
              { label: "Audio settings", icon: <SettingsIcon />, onClick: () => {} },
              { label: "Video settings", icon: <SettingsIcon />, onClick: () => {} },
              {
                label: "Leave room",
                icon: <LeaveIcon />,
                onClick: () => {
                  room.disconnect();
                  onLeave?.();
                },
                danger: true,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

// ── List Row ─────────────────────────────────────────────────────────

function ListRow({
  row,
  isHost,
  roomName,
  myLang,
}: {
  row: ParticipantRow;
  isHost: boolean;
  roomName: string;
  myLang: string;
}) {
  const langInfo = row.lang ? getLanguageByCode(row.lang) : undefined;
  const needsTranslation =
    myLang !== "none" && !!row.lang && row.lang !== myLang;

  const statusParts: string[] = [];
  if (row.isSpeaking) statusParts.push("Speaking now");
  if (row.screenSharing) statusParts.push("Screen sharing");
  const statusText = statusParts.join(" · ");

  return (
    <div
      className={`ps-list-row ${row.isSpeaking ? "ps-list-row--speaking" : ""}`}
    >
      <div className="ps-list-row-main">
        {/* Avatar */}
        <div
          className={`ps-list-avatar ${row.isSpeaking ? "ps-list-avatar--speaking" : ""}`}
        >
          {row.initial}
        </div>

        {/* Info column */}
        <div className="ps-list-info">
          <div className="ps-list-name-row">
            <span className="ps-name ps-name--truncate">{row.name}</span>
            {langInfo && (
              <span className="ps-badge ps-badge--lang">
                {langInfo.flag} {needsTranslation ? `→ ${myLang.toUpperCase()}` : langInfo.code.toUpperCase()}
              </span>
            )}
          </div>
          {statusText && (
            <div className="ps-list-status">
              {row.isSpeaking && <SpeakIcon />}
              {statusText}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="ps-list-actions">
          {isHost && (
            <button
              className="ps-list-action-btn"
              title="Mute"
              aria-label="Mute participant"
              onClick={async () => {
                try {
                  await fetch("/api/moderate", {
                    method: "POST",
                    body: JSON.stringify({
                      action: "mute",
                      roomName,
                      identity: row.identity,
                    }),
                  });
                } catch {
                  alert("Failed to mute");
                }
              }}
            >
              <MicOffIcon />
            </button>
          )}
          <MoreMenu
            trigger={
              <button className="ps-list-action-btn" title="More" aria-label="More options">
                <MoreVerticalIcon />
              </button>
            }
            items={
              isHost
                ? hostMoreItems(row, roomName)
                : participantMoreItems()
            }
          />
        </div>
      </div>

      {/* Mic/cam/hand icons row */}
      <div className="ps-list-indicators">
        <span className={`ps-indicator ${row.micOn ? "" : "ps-indicator--off"}`}>
          {row.micOn ? <MicOnIcon /> : <MicOffIcon />}
        </span>
        <span className={`ps-indicator ${row.camOn ? "" : "ps-indicator--off"}`}>
          {row.camOn ? <CamOnIcon /> : <CamOffIcon />}
        </span>
        {row.handRaised && (
          <span className="ps-indicator ps-indicator--raised">
            <HandRaiseIcon />
          </span>
        )}
        {row.screenSharing && (
          <span className="ps-indicator ps-indicator--screen">
            <ScreenShareOnIcon />
          </span>
        )}
      </div>
    </div>
  );
}

// ── Video / Grid Card ────────────────────────────────────────────────

function VideoCard({
  row,
  isHost,
  roomName,
  myLang,
}: {
  row: ParticipantRow;
  isHost: boolean;
  roomName: string;
  myLang: string;
}) {
  const langInfo = row.lang ? getLanguageByCode(row.lang) : undefined;

  return (
    <div
      className={`ps-video-card ${row.isSpeaking ? "ps-video-card--speaking" : ""}`}
    >
      {/* More menu top-right */}
      <div className="ps-video-card-menu">
        <MoreMenu
          trigger={
            <button className="ps-video-card-more-btn" title="More" aria-label="More options">
              <MoreVerticalIcon />
            </button>
          }
          items={
            isHost
              ? hostMoreItems(row, roomName)
              : participantMoreItems()
          }
        />
      </div>

      {/* Avatar / video area */}
      <div className="ps-video-card-avatar">
        <span className="ps-video-card-initial">{row.initial}</span>
      </div>

      {/* Overlay info */}
      <div className="ps-video-card-info">
        <div className="ps-video-card-name-row">
          <span className="ps-name ps-name--truncate">{row.name}</span>
        </div>
        <div className="ps-video-card-status">
          {row.micOn ? <MicOnIcon /> : <MicOffIcon />}
          <span>
            {row.micOn ? "Mic on" : "Muted"}
            {langInfo && ` · ${langInfo.flag}`}
          </span>
        </div>
      </div>

      {/* Speaking indicator ring */}
      {row.isSpeaking && <div className="ps-video-card-ring" />}
    </div>
  );
}

// ── More Menu (fixed positioning, never overflows) ───────────────────

interface MoreItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}

function MoreMenu({
  trigger,
  items,
}: {
  trigger: React.ReactElement;
  items: MoreItem[];
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  // Close on click outside or scroll
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("scroll", close, true);
    };
  }, [open]);

  // Position the dropdown fixed to the trigger button
  const handleOpen = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (open) {
        setOpen(false);
        return;
      }
      const el = (e.currentTarget as HTMLElement).querySelector("button") || e.currentTarget;
      const rect = el.getBoundingClientRect();
      // Estimate dropdown height: ~36px per item, cap at 320px
      const estHeight = Math.min(items.length * 36 + 16, 320);
      let top = rect.bottom + 4;
      // Flip upward if it would go off-screen
      if (top + estHeight > window.innerHeight) {
        top = rect.top - estHeight - 4;
      }
      setPos({ top, right: window.innerWidth - rect.right });
      setOpen(true);
    },
    [open, items.length],
  );

  return (
    <div className="ps-more-wrap" ref={triggerRef}>
      <div onClick={handleOpen}>{trigger}</div>
      {open && pos && (
        <div
          className="ps-more-dropdown"
          style={{
            position: "fixed",
            top: pos.top,
            right: pos.right,
            zIndex: 1000,
          }}
        >
          <div className="ps-more-dropdown-inner">
            {items.length === 0 && (
              <div className="ps-more-item ps-more-item--disabled">No actions</div>
            )}
            {items.map((item, i) => (
              <button
                key={i}
                className={`ps-more-item ${item.danger ? "ps-more-item--danger" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  item.onClick();
                  setOpen(false);
                }}
              >
                {item.icon && <span className="ps-more-item-icon">{item.icon}</span>}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── More menu item generators ────────────────────────────────────────

function hostMoreItems(
  row: ParticipantRow,
  roomName: string,
): MoreItem[] {
  const moderate = async (action: string, extra: Record<string, string> = {}) => {
    try {
      const res = await fetch("/api/moderate", {
        method: "POST",
        body: JSON.stringify({ action, roomName, identity: row.identity, ...extra }),
      });
      if (!res.ok) throw new Error("Moderation request failed");
    } catch {
      alert(`Failed to ${action} participant`);
    }
  };

  return [
    { label: "Mute", icon: <MicOffIcon />, onClick: () => moderate("mute") },
    { label: "Ask to unmute", icon: <MicOnIcon />, onClick: () => {} },
    { label: "Pin for everyone", icon: <PinIcon />, onClick: () => {} },
    { label: "Make presenter", icon: <PersonIcon />, onClick: () => {} },
    { label: "Remove presenter", icon: <PersonIcon />, onClick: () => {} },
    { label: "Turn camera off", icon: <CamOffIcon />, onClick: () => {} },
    {
      label: "Lower hand",
      icon: <HandRaiseIcon />,
      onClick: () => {},
    },
    {
      label: "Remove from room",
      icon: <LeaveIcon />,
      onClick: () => {
        if (confirm(`Remove ${row.name} from the meeting?`)) {
          moderate("kick");
        }
      },
      danger: true,
    },
  ];
}

function participantMoreItems(): MoreItem[] {
  return [
    { label: "Pin for me", icon: <PinIcon />, onClick: () => {} },
    { label: "Send message", icon: <ChatIcon />, onClick: () => {} },
    { label: "View profile", icon: <PersonIcon />, onClick: () => {} },
  ];
}

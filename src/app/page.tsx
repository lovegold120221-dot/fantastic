"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

type ActivePanel = "join" | "schedule";

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [creating, setCreating] = useState(false);
  // All hooks must be called before any conditional returns (Rules of Hooks).
  const [activePanel, setActivePanel] = useState<ActivePanel>("join");
  const [joinValue, setJoinValue] = useState("");
  const [joinError, setJoinError] = useState("");
  const [scheduleTitle, setScheduleTitle] = useState("Orbit Meeting");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduledLink, setScheduledLink] = useState("");
  const [copied, setCopied] = useState(false);
  const { profile } = useUser();
  const theme = profile?.theme || "system";
  const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const waitingForAuth = supabaseConfigured && authLoading;
  const redirectingToAuth = supabaseConfigured && !authLoading && !user;

  // Redirect unauthenticated users to the login page.
  // Skip redirect if Supabase isn't configured (anonymous usage).
  useEffect(() => {
    if (redirectingToAuth) {
      router.replace("/auth/login");
    }
  }, [redirectingToAuth, router]);

  // Show nothing while auth state is loading or redirecting.
  if (waitingForAuth) {
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <h1 className="auth-title">Orbit Meeting</h1>
        </div>
      </main>
    );
  }
  if (redirectingToAuth) return null;

  function createSession() {
    setCreating(true);
    const sessionId = crypto.randomUUID();
    window.sessionStorage.setItem("orbitHostRoom", sessionId);
    router.push(`/session/${sessionId}`);
  }

  function parseMeetingId(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return "";

    try {
      const url = new URL(trimmed);
      const parts = url.pathname.split("/").filter(Boolean);
      const sessionIndex = parts.indexOf("session");
      if (sessionIndex !== -1 && parts[sessionIndex + 1]) {
        return parts[sessionIndex + 1];
      }
    } catch {
      // Plain room names are handled below.
    }

    return trimmed
      .replace(/^\/+|\/+$/g, "")
      .replace(/^session\//, "")
      .replace(/\/room$/, "");
  }

  function joinMeeting() {
    const meetingId = parseMeetingId(joinValue);
    if (!meetingId) {
      setJoinError("Enter a meeting link or meeting ID.");
      return;
    }
    setJoinError("");
    router.push(`/session/${encodeURIComponent(meetingId)}`);
  }

  async function showSchedulePanel() {
    setActivePanel("schedule");
    setCopied(false);
    if (!scheduleTime) {
      setScheduleTime(getDefaultScheduleTime());
    }
    if (!scheduledLink) {
      setScheduledLink(`${window.location.origin}/session/${crypto.randomUUID()}`);
    }
  }

  async function copyScheduleLink() {
    if (!scheduledLink) return;
    await navigator.clipboard.writeText(scheduledLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getEmailLink() {
    const timeStr = scheduleTime ? formatScheduleTime(scheduleTime) : "Not set";
    const subject = `Invitation: ${scheduleTitle}`;
    const body = `You are invited to join an Orbit Meeting!\n\nTopic: ${scheduleTitle}\nTime: ${timeStr}\nJoin Link: ${scheduledLink}\n\nSee you there!`;
    return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function getGmailLink() {
    const timeStr = scheduleTime ? formatScheduleTime(scheduleTime) : "Not set";
    const subject = `Invitation: ${scheduleTitle}`;
    const body = `You are invited to join an Orbit Meeting!%0A%0ATopic: ${encodeURIComponent(scheduleTitle)}%0ATime: ${encodeURIComponent(timeStr)}%0AJoin Link: ${encodeURIComponent(scheduledLink)}%0A%0ASee you there!`;
    return `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${body}`;
  }

  function getWhatsAppLink() {
    const timeStr = scheduleTime ? formatScheduleTime(scheduleTime) : "Not set";
    const text = `You are invited to join an Orbit Meeting!\n\nTopic: ${scheduleTitle}\nTime: ${timeStr}\nLink: ${scheduledLink}`;
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  return (
    <main className="entry-shell" data-theme-preference={theme}>

      <section className="entry-main">
        <header className="entry-topbar">
          <div className="entry-topbar-inner">
            <div className="entry-topbar-left">
              <div className="entry-brand">
                <Image src="/icon-eburon.svg" alt="Eburon AI" width={34} height={34} className="entry-brand-logo" unoptimized />
                <span>Orbit Meeting</span>
              </div>
            </div>
            <div className="entry-topbar-actions">
              {user ? (
                <div className="entry-auth-section">
                  <span className="entry-auth-email" title={user.email ?? ""}>{user.email}</span>
                  <button className="entry-auth-btn" onClick={() => signOut()}>Sign out</button>
                </div>
              ) : (
                <div className="entry-auth-section">
                  <Link href="/auth/login" className="entry-auth-btn">Sign in</Link>
                  <Link href="/auth/signup" className="entry-auth-btn">Create account</Link>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="entry-content">
          <section className="entry-actions" aria-label="Meeting actions">
            <button
              className="meeting-action meeting-action--create"
              onClick={createSession}
              disabled={creating}
              id="create-session-btn"
            >
              <span className="meeting-action-icon" aria-hidden>
                <VideoPlusIcon />
              </span>
              <span>{creating ? "Creating..." : "Create"}</span>
            </button>

            <button
              className="meeting-action meeting-action--join"
              onClick={() => setActivePanel("join")}
            >
              <span className="meeting-action-icon" aria-hidden>
                <JoinIcon />
              </span>
              <span>Join</span>
            </button>

            <button
              className="meeting-action meeting-action--schedule"
              onClick={showSchedulePanel}
            >
              <span className="meeting-action-icon" aria-hidden>
                <CalendarIcon />
              </span>
              <span>Schedule meeting</span>
            </button>
          </section>

          <section className="entry-panel" aria-live="polite">
            {activePanel === "join" ? (
              <form
                className="entry-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  joinMeeting();
                }}
              >
                <div>
                  <p className="entry-panel-eyebrow">Join meeting</p>
                  <h2>Enter a meeting link or ID</h2>
                </div>
                <label className="entry-field">
                  <span>Meeting link or ID</span>
                  <input
                    value={joinValue}
                    onChange={(event) => {
                      setJoinValue(event.target.value);
                      setJoinError("");
                    }}
                    placeholder="https://.../session/room-id"
                    autoComplete="off"
                  />
                </label>
                {joinError && <p className="entry-error">{joinError}</p>}
                <button className="entry-primary" type="submit">
                  Join meeting
                </button>
              </form>
            ) : (
              <div className="entry-form">
                <div>
                  <p className="entry-panel-eyebrow">Schedule meeting</p>
                  <h2>Create an invite link</h2>
                </div>
                <label className="entry-field">
                  <span>Topic</span>
                  <input
                    value={scheduleTitle}
                    onChange={(event) => setScheduleTitle(event.target.value)}
                    maxLength={60}
                  />
                </label>
                <label className="entry-field">
                  <span>Date and time</span>
                  <input
                    type="datetime-local"
                    value={scheduleTime}
                    onChange={(event) => setScheduleTime(event.target.value)}
                  />
                </label>
                <div className="schedule-link">
                  <span>{scheduledLink}</span>
                </div>
                <button
                  className="entry-primary"
                  type="button"
                  onClick={copyScheduleLink}
                >
                  {copied ? "Copied" : "Copy invite"}
                </button>

                <div className="invite-share-bar">
                  <button
                    type="button"
                    className="share-icon-btn share-icon-email"
                    onClick={() => { window.location.href = getEmailLink(); }}
                    title="Share via Email"
                    aria-label="Share via Email"
                  >
                    <MailIcon />
                    <span>Email</span>
                  </button>
                  <button
                    type="button"
                    className="share-icon-btn share-icon-gmail"
                    onClick={() => { window.open(getGmailLink(), "_blank", "noopener,noreferrer"); }}
                    title="Share via Gmail"
                    aria-label="Share via Gmail"
                  >
                    <GmailIcon />
                    <span>Gmail</span>
                  </button>
                  <button
                    type="button"
                    className="share-icon-btn share-icon-whatsapp"
                    onClick={() => { window.open(getWhatsAppLink(), "_blank", "noopener,noreferrer"); }}
                    title="Share via WhatsApp"
                    aria-label="Share via WhatsApp"
                  >
                    <WhatsAppIcon />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="entry-upcoming" aria-label="Upcoming meeting">
          <div>
            <p className="entry-panel-eyebrow">Next up</p>
            <h2>{activePanel === "schedule" ? scheduleTitle : "Ready when you are"}</h2>
          </div>
          <p>
            {activePanel === "schedule" && scheduleTime
              ? formatScheduleTime(scheduleTime)
              : "Create a room now or join with an invite link."}
          </p>
        </section>
      </section>
    </main>
  );
}

function getDefaultScheduleTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 30);
  date.setSeconds(0, 0);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function formatScheduleTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time not set";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function VideoPlusIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h7A2.5 2.5 0 0 1 16 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 4 16.5z" />
      <path d="m16 10 4-2.5v9L16 14" />
      <path d="M10 9v6" />
      <path d="M7 12h6" />
    </svg>
  );
}

function JoinIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12h11" />
      <path d="m11 8 4 4-4 4" />
      <path d="M15 5h2.5A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5H15" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 3v4" />
      <path d="M17 3v4" />
      <path d="M4.5 8.5h15" />
      <path
        d="M6.5 5h11A2.5 2.5 0 0 1 20 7.5v10A2.5 2.5 0 0 1 17.5 20h-11A2.5 2.5 0 0 1 4 17.5v-10A2.5 2.5 0 0 1 6.5 5z"
      />
      <path d="M9 13h6" />
      <path d="M9 16h3" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function GmailIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
    </svg>
  );
}

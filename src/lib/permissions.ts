// Orbit Meeting — Permissions Utility
// Unified API for checking, requesting, and managing device permissions
// across desktop and mobile platforms.

export type PermissionKind =
  | "camera"
  | "microphone"
  | "screen-capture"
  | "notifications"
  | "file-save";

export type PermissionStatus = "granted" | "denied" | "prompt" | "unsupported";

// ── Platform detection ───────────────────────────────────────────────────

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/.test(navigator.userAgent);
}

export function isMobile(): boolean {
  return isIOS() || isAndroid();
}

export function isPWA(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

// ── Permission queries ───────────────────────────────────────────────────

function canQueryPermission(): boolean {
  return typeof navigator !== "undefined" && "permissions" in navigator;
}

export async function getPermissionStatus(kind: PermissionKind): Promise<PermissionStatus> {
  switch (kind) {
    case "camera":
    case "microphone": {
      // Use Permissions API if available (Chrome/Edge/Firefox)
      if (canQueryPermission()) {
        try {
          const result = await navigator.permissions.query({
            name: kind as PermissionName,
          });
          return result.state as PermissionStatus;
        } catch {
          // Fallback: try getUserMedia
          return await probeMediaKind(kind);
        }
      }
      return await probeMediaKind(kind);
    }

    case "screen-capture": {
      if (isIOS()) return "unsupported";
      if (typeof navigator === "undefined") return "unsupported";
      if (!navigator.mediaDevices?.getDisplayMedia) return "unsupported";
      return "prompt"; // Always shows a prompt — can't know ahead
    }

    case "notifications": {
      if (typeof Notification === "undefined") return "unsupported";
      if (Notification.permission === "granted") return "granted";
      if (Notification.permission === "denied") return "denied";
      return "prompt";
    }

    case "file-save": {
      // showSaveFilePicker is supported on desktop Chrome/Edge, not on mobile
      if (typeof window === "undefined") return "unsupported";
      if ("showSaveFilePicker" in window) return "prompt";
      return "unsupported"; // Falls back to <a> download — always works
    }
  }
}

async function probeMediaKind(kind: "camera" | "microphone"): Promise<PermissionStatus> {
  if (typeof navigator === "undefined") return "unsupported";
  if (!navigator.mediaDevices?.enumerateDevices) return "unsupported";

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const kindMap = {
      camera: "videoinput" as MediaDeviceKind,
      microphone: "audioinput" as MediaDeviceKind,
    };
    const hasDevice = devices.some((d) => d.kind === kindMap[kind]);
    if (!hasDevice) return "denied"; // no device found

    // Try a quick getUserMedia to probe permission
    const constraints: MediaStreamConstraints =
      kind === "camera" ? { video: true } : { audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch (err: unknown) {
    if (err instanceof DOMException) {
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError" ||
        err.name === "SecurityError"
      ) {
        return "denied";
      }
      if (err.name === "NotFoundError") return "denied";
    }
    return "denied";
  }
}

// ── Permission requests ──────────────────────────────────────────────────

export async function requestPermission(kind: PermissionKind): Promise<PermissionStatus> {
  switch (kind) {
    case "camera":
    case "microphone": {
      try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
          return "unsupported";
        }
        const constraints: MediaStreamConstraints =
          kind === "camera" ? { video: true } : { audio: true };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        stream.getTracks().forEach((t) => t.stop());
        return "granted";
      } catch (err: unknown) {
        if (err instanceof DOMException) {
          if (
            err.name === "NotAllowedError" ||
            err.name === "PermissionDeniedError"
          ) {
            return "denied";
          }
        }
        return "denied";
      }
    }

    case "screen-capture": {
      if (isIOS()) return "unsupported";
      try {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
          return "unsupported";
        }
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
        return "granted";
      } catch {
        return "denied";
      }
    }

    case "notifications": {
      if (typeof Notification === "undefined") return "unsupported";
      const result = await Notification.requestPermission();
      return result as PermissionStatus;
    }

    case "file-save": {
      return "prompt"; // Can't proactively request; shown when user tries to save
    }
  }
}

// ── Bulk permission helper ───────────────────────────────────────────────

export type PermissionReport = {
  kind: PermissionKind;
  label: string;
  status: PermissionStatus;
  iosNote?: string;
};

export async function getFullPermissionReport(): Promise<PermissionReport[]> {
  const kinds: { kind: PermissionKind; label: string }[] = [
    { kind: "camera", label: "Camera" },
    { kind: "microphone", label: "Microphone" },
    { kind: "screen-capture", label: "Screen Share" },
    { kind: "notifications", label: "Notifications" },
    { kind: "file-save", label: "Save Files" },
  ];

  const results: PermissionReport[] = [];
  for (const entry of kinds) {
    const status = await getPermissionStatus(entry.kind);
    results.push({
      ...entry,
      status,
      iosNote:
        entry.kind === "screen-capture" && isIOS()
          ? "Not supported on iOS. Use the desktop app to share your screen."
          : entry.kind === "file-save" && isMobile()
            ? "Files will download to your device automatically."
            : undefined,
    });
  }
  return results;
}

// ── Request all needed permissions for a meeting ─────────────────────────

export async function requestMeetingPermissions(): Promise<{
  camera: PermissionStatus;
  microphone: PermissionStatus;
}> {
  const [camera, microphone] = await Promise.all([
    requestPermission("camera"),
    requestPermission("microphone"),
  ]);
  return { camera, microphone };
}

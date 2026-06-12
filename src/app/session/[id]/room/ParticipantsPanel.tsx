"use client";

import { useLocalParticipant } from "@livekit/components-react";
import { Track, type LocalParticipant, type RemoteParticipant } from "livekit-client";
import { MicOffIcon, CamOffIcon } from "./icons";
import ParticipantTile from "./ParticipantTile";

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

  const micOn = !!microphoneTrack && !microphoneTrack.isMuted;
  const camOn =
    !!cameraTrack &&
    cameraTrack.source === Track.Source.Camera &&
    !cameraTrack.isMuted;
  const displayName = localParticipant?.name || localParticipant?.identity || "You";
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <div className="sidebar-panel">
      <div className="sidebar-header">
        <span>Participants ({participants.length + 1})</span>
        <button
          className="sidebar-close"
          onClick={onClose}
          aria-label="Close Participants"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="sidebar-body">
        {/* Host / You tile */}
        <div className="pt-self-row">
          <div className="pt-self-avatar">
            <span>{initial}</span>
          </div>
          <div className="pt-self-info">
            <span className="pt-self-name">{displayName}</span>
            <span className="pt-self-tag">You</span>
          </div>
          <div className="pt-self-indicators">
            {!micOn && (
              <span className="pt-self-icon" title="Microphone off">
                <MicOffIcon />
              </span>
            )}
            {!camOn && (
              <span className="pt-self-icon" title="Camera off">
                <CamOffIcon />
              </span>
            )}
          </div>
        </div>

        {participants.map((p) => (
          <ParticipantTile key={p.identity} participant={p} myLang={myLang} isHost={isHost} roomName={roomName} />
        ))}
      </div>
    </div>
  );
}

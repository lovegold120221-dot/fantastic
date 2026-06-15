"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRoomContext, useLocalParticipant } from "@livekit/components-react";

export default function PersistentCallBar({ 
  sessionId, 
  onLeave 
}: { 
  sessionId: string; 
  onLeave: () => void 
}) {
  const pathname = usePathname();
  const router = useRouter();
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();

  // Hide the floating bar if we are actively viewing the room page
  if (pathname === `/session/${sessionId}/room`) {
    return null;
  }

  return (
    <div className="persistent-call-bar">
      <div className="persistent-call-bar-content">
        <div className="persistent-call-status">
          <div className="pulse-dot"></div>
          <span>Call in progress ({sessionId})</span>
        </div>
        
        <div className="persistent-call-actions">
          <button 
            className="btn btn-dark" 
            onClick={() => router.push(`/session/${sessionId}/room`)}
          >
            Return to Room
          </button>
          
          {localParticipant?.isScreenShareEnabled && (
            <button 
              className="btn btn-outline" 
              onClick={() => localParticipant.setScreenShareEnabled(false)}
            >
              Stop Screen Share
            </button>
          )}
          
          <button 
            className="btn persistent-call-leave" 
            onClick={async () => {
              await room.disconnect();
              onLeave();
            }}
          >
            End Call
          </button>
        </div>
      </div>
    </div>
  );
}

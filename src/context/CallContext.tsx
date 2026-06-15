"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
} from "@livekit/components-react";
import "@livekit/components-styles";
import PersistentCallBar from "@/components/PersistentCallBar";

export interface ActiveCallState {
  token: string;
  serverUrl: string;
  sessionId: string;
  initialLang: string;
}

interface CallContextValue {
  activeCall: ActiveCallState | null;
  setActiveCall: (call: ActiveCallState | null) => void;
  leaveCall: () => void;
}

const CallContext = createContext<CallContextValue | undefined>(undefined);

export function CallProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);

  const leaveCall = () => {
    setActiveCall(null);
    router.push("/");
  };

  return (
    <CallContext.Provider value={{ activeCall, setActiveCall, leaveCall }}>
      {activeCall ? (
        <LiveKitRoom
          token={activeCall.token}
          serverUrl={activeCall.serverUrl}
          video={false}
          audio={false}
          connect={true}
          onDisconnected={() => {
            setActiveCall(null);
          }}
          data-lk-theme="default"
        >
          {children}
          <RoomAudioRenderer />
          <StartAudio
            label="🔊 Tap to enable translated audio"
            className="btn start-audio-fixed"
          />
          <PersistentCallBar sessionId={activeCall.sessionId} onLeave={leaveCall} />
        </LiveKitRoom>
      ) : (
        children
      )}
    </CallContext.Provider>
  );
}

export function useCallContext() {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error("useCallContext must be used within a CallProvider");
  }
  return context;
}

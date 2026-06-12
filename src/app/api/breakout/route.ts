import { NextRequest, NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";

export async function POST(req: NextRequest) {
  try {
    const { action, originalRoom, assignments, breakoutRooms } = await req.json();

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const serverUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !serverUrl) {
      return NextResponse.json({ error: "LiveKit credentials not configured" }, { status: 500 });
    }

    const roomService = new RoomServiceClient(serverUrl, apiKey, apiSecret);

    if (action === "start") {
      for (const assignment of assignments) {
        const payload = JSON.stringify({
          type: "BREAKOUT_JOIN",
          newRoom: assignment.newRoom,
          originalRoom,
        });
        const data = new TextEncoder().encode(payload);
        
        await roomService.sendData(originalRoom, data, 1, { // 1 = RELIABLE
          destinationIdentities: [assignment.identity],
          topic: "breakout",
        });
      }
      return NextResponse.json({ success: true });
    } else if (action === "stop") {
      for (const bRoom of breakoutRooms) {
        const payload = JSON.stringify({
          type: "BREAKOUT_END",
          originalRoom,
        });
        const data = new TextEncoder().encode(payload);
        
        try {
          await roomService.sendData(bRoom, data, 1, { topic: "breakout" });
        } catch (e) {
          // Room might not exist if it was empty
          console.log(`Failed to broadcast to breakout room ${bRoom}:`, e);
        }
      }
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Breakout API Error:", error);
    const message = error instanceof Error ? error.message : "Failed to process breakout request.";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

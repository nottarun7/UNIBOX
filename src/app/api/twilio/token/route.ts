import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Twilio from "twilio";

const AccessToken = Twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

/**
 * Generate Twilio Access Token for Voice SDK
 * This token allows the browser to make/receive calls via Twilio Client
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
      console.error("Missing Twilio Voice configuration:", {
        accountSid: !!accountSid,
        apiKey: !!apiKey,
        apiSecret: !!apiSecret,
        twimlAppSid: !!twimlAppSid,
      });
      return NextResponse.json(
        { error: "Twilio Voice not configured. Add TWILIO_API_KEY, TWILIO_API_SECRET, and TWILIO_TWIML_APP_SID to .env" },
        { status: 500 }
      );
    }

    // Create an access token with Voice grant
    const identity = `user_${userId}`;
    const token = new AccessToken(accountSid, apiKey, apiSecret, {
      identity,
      ttl: 3600, // 1 hour
    });

    // Create a Voice grant for this token
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true, // Allow incoming calls
    });

    token.addGrant(voiceGrant);

    return NextResponse.json({
      token: token.toJwt(),
      identity,
    });
  } catch (error: any) {
    console.error("Error generating Twilio token:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate token" },
      { status: 500 }
    );
  }
}

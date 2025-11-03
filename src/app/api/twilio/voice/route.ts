import { NextResponse } from "next/server";
import Twilio from "twilio";

const VoiceResponse = Twilio.twiml.VoiceResponse;

/**
 * TwiML endpoint for handling outgoing voice calls
 * Twilio will request this URL when a call is initiated from the browser
 */
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const to = formData.get("To") as string;
    const from = formData.get("From") as string;
    const callerId = process.env.TWILIO_FROM_NUMBER;

    console.log("[Voice TwiML] Outgoing call:", { to, from, callerId });

    if (!callerId) {
      console.error("TWILIO_FROM_NUMBER not configured");
      return new Response("Configuration error", { status: 500 });
    }

    const response = new VoiceResponse();

    // Validate the phone number (basic check)
    if (!to || to.length < 10) {
      response.say("Invalid phone number. Please try again.");
      return new Response(response.toString(), {
        headers: { "Content-Type": "text/xml" },
      });
    }

    // Dial the number
    const dial = response.dial({
      callerId: callerId,
      timeout: 30,
      record: "record-from-answer-dual", // Optional: record calls
    });

    // If it's a WhatsApp call
    if (to.startsWith("whatsapp:")) {
      dial.client(to);
    } else {
      // Regular phone number
      dial.number(to);
    }

    console.log("[Voice TwiML] Generated TwiML:", response.toString());

    return new Response(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    console.error("[Voice TwiML] Error:", error);
    const response = new VoiceResponse();
    response.say("An error occurred. Please try again later.");
    return new Response(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}

/**
 * Handle incoming calls
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("From");
    const to = searchParams.get("To");

    console.log("[Voice TwiML] Incoming call:", { from, to });

    const response = new VoiceResponse();
    
    // You can customize this to route to specific users
    response.say("Welcome to your unified inbox. Connecting you now.");
    
    // Forward to a specific user or queue
    const dial = response.dial({
      timeout: 30,
    });
    
    // Route to user client (you'd need to determine which user to route to)
    dial.client("user_default");

    return new Response(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  } catch (error: any) {
    console.error("[Voice TwiML] Error:", error);
    const response = new VoiceResponse();
    response.say("An error occurred. Please try again later.");
    return new Response(response.toString(), {
      headers: { "Content-Type": "text/xml" },
    });
  }
}

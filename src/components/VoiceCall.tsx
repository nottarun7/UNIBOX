"use client";

import { useEffect, useState, useRef } from "react";
import { Device, Call } from "@twilio/voice-sdk";

interface VoiceCallProps {
  phoneNumber?: string;
  onCallEnd?: () => void;
}

interface CallHistoryEntry {
  phoneNumber: string;
  timestamp: Date;
  duration: number;
  direction: 'outgoing' | 'incoming';
  status: 'completed' | 'missed' | 'failed';
}

export default function VoiceCall({ phoneNumber, onCallEnd }: VoiceCallProps) {
  const [device, setDevice] = useState<Device | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [callHistory, setCallHistory] = useState<CallHistoryEntry[]>([]);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const deviceRef = useRef<Device | null>(null);

  // Initialize Twilio Device
  useEffect(() => {
    let mounted = true;
    let deviceInstance: Device | null = null;

    async function initializeDevice() {
      if (isInitializing || deviceRef.current) return;
      
      setIsInitializing(true);
      setError(null);

      try {
        console.log("[VoiceCall] Fetching access token...");
        const response = await fetch("/api/twilio/token");
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to get access token");
        }

        const { token } = await response.json();
        console.log("[VoiceCall] Token received, initializing device...");

        deviceInstance = new Device(token, {
          logLevel: 1, // 0=trace, 1=debug, 2=info, 3=warn, 4=error, 5=silent
          codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        });

        // Device event listeners
        deviceInstance.on("registered", () => {
          console.log("[VoiceCall] Device registered");
          if (mounted) setStatus("ready");
        });

        deviceInstance.on("error", (error) => {
          console.error("[VoiceCall] Device error:", error);
          if (mounted) {
            setError(error.message || "Device error occurred");
            setStatus("error");
          }
        });

        deviceInstance.on("incoming", (incomingCall) => {
          console.log("[VoiceCall] Incoming call:", incomingCall.parameters.From);
          if (mounted) {
            setCall(incomingCall);
            setStatus("incoming");
            setupCallListeners(incomingCall);
          }
        });

        deviceInstance.on("tokenWillExpire", async () => {
          console.log("[VoiceCall] Token expiring, refreshing...");
          try {
            const response = await fetch("/api/twilio/token");
            const { token } = await response.json();
            deviceInstance?.updateToken(token);
          } catch (err) {
            console.error("[VoiceCall] Failed to refresh token:", err);
          }
        });

        // Register the device
        await deviceInstance.register();
        
        if (mounted) {
          setDevice(deviceInstance);
          deviceRef.current = deviceInstance;
        }
      } catch (err: any) {
        console.error("[VoiceCall] Initialization error:", err);
        if (mounted) {
          setError(err.message || "Failed to initialize voice calling");
          setStatus("error");
        }
      } finally {
        if (mounted) setIsInitializing(false);
      }
    }

    initializeDevice();

    return () => {
      mounted = false;
      if (deviceInstance) {
        console.log("[VoiceCall] Cleaning up device...");
        deviceInstance.unregister();
        deviceInstance.destroy();
      }
      deviceRef.current = null;
    };
  }, []);

  // Setup call event listeners
  function setupCallListeners(callInstance: Call) {
    callInstance.on("accept", () => {
      console.log("[VoiceCall] Call accepted");
      setStatus("connected");
      setCallStartTime(new Date());
    });

    callInstance.on("disconnect", () => {
      console.log("[VoiceCall] Call disconnected");
      addToHistory('completed');
      setStatus("ready");
      setCall(null);
      setCallStartTime(null);
      onCallEnd?.();
    });

    callInstance.on("cancel", () => {
      console.log("[VoiceCall] Call cancelled");
      addToHistory('missed');
      setStatus("ready");
      setCall(null);
      setCallStartTime(null);
      onCallEnd?.();
    });

    callInstance.on("reject", () => {
      console.log("[VoiceCall] Call rejected");
      addToHistory('missed');
      setStatus("ready");
      setCall(null);
      setCallStartTime(null);
      onCallEnd?.();
    });

    callInstance.on("error", (error) => {
      console.error("[VoiceCall] Call error:", error);
      setError(error.message || "Call error occurred");
      addToHistory('failed');
      setStatus("ready");
      setCall(null);
      setCallStartTime(null);
    });
  }

  // Add call to history
  function addToHistory(callStatus: 'completed' | 'missed' | 'failed') {
    if (!phoneNumber) return;
    
    const duration = callStartTime ? Math.floor((new Date().getTime() - callStartTime.getTime()) / 1000) : 0;
    const entry: CallHistoryEntry = {
      phoneNumber,
      timestamp: new Date(),
      duration,
      direction: status === 'incoming' ? 'incoming' : 'outgoing',
      status: callStatus,
    };
    
    setCallHistory(prev => [entry, ...prev].slice(0, 10)); // Keep last 10 calls
  }

  // Make an outgoing call
  async function makeCall(to: string) {
    if (!device) {
      setError("Device not initialized");
      return;
    }

    if (!to) {
      setError("Phone number required");
      return;
    }

    try {
      setError(null);
      setStatus("connecting");
      console.log("[VoiceCall] Making call to:", to);

      const outgoingCall = await device.connect({
        params: {
          To: to,
        },
      });

      setCall(outgoingCall);
      setupCallListeners(outgoingCall);
    } catch (err: any) {
      console.error("[VoiceCall] Failed to make call:", err);
      setError(err.message || "Failed to make call");
      setStatus("ready");
    }
  }

  // Answer incoming call
  function answerCall() {
    if (call) {
      call.accept();
    }
  }

  // Hang up
  function hangUp() {
    if (call) {
      call.disconnect();
    }
  }

  // Toggle mute
  function toggleMute() {
    if (call) {
      const newMutedState = !muted;
      call.mute(newMutedState);
      setMuted(newMutedState);
    }
  }

  // Send DTMF digits (for phone menus)
  function sendDigit(digit: string) {
    if (call) {
      call.sendDigits(digit);
    }
  }

  // Format duration
  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return (
    <div className="voice-call-widget bg-white border border-gray-200 rounded-lg shadow-sm p-3 max-w-sm">
      {/* Compact Status indicator */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          Voice Call
          <div
            className={`w-2 h-2 rounded-full ${
              status === "ready"
                ? "bg-green-500"
                : status === "connecting" || status === "connected"
                ? "bg-blue-500 animate-pulse"
                : status === "error"
                ? "bg-red-500"
                : "bg-gray-400"
            }`}
          />
        </h3>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"
        >
          📞 History ({callHistory.length})
        </button>
      </div>

      {/* Error message - compact */}
      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          {error}
        </div>
      )}

      {/* Call History */}
      {showHistory && (
        <div className="mb-2 max-h-32 overflow-y-auto border border-gray-200 rounded bg-gray-50">
          {callHistory.length === 0 ? (
            <p className="text-xs text-gray-500 p-2 text-center">No call history yet</p>
          ) : (
            <div className="divide-y divide-gray-200">
              {callHistory.map((entry, idx) => (
                <div key={idx} className="p-2 hover:bg-gray-100 text-xs flex justify-between items-center">
                  <div className="flex-1">
                    <div className="font-medium">{entry.phoneNumber}</div>
                    <div className="text-gray-500">
                      {entry.direction === 'incoming' ? '📞 ' : '📲 '}
                      {entry.timestamp.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                      {entry.status === 'completed' && ` • ${formatDuration(entry.duration)}`}
                    </div>
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    entry.status === 'completed' ? 'bg-green-100 text-green-700' :
                    entry.status === 'missed' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {entry.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Loading state - compact */}
      {isInitializing && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-1" />
          <p className="text-xs text-gray-600">Initializing...</p>
        </div>
      )}

      {/* Ready to call - compact */}
      {status === "ready" && !isInitializing && !showHistory && (
        <div>
          <button
            onClick={() => phoneNumber && makeCall(phoneNumber)}
            disabled={!phoneNumber || !device}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {phoneNumber ? `Call ${phoneNumber}` : "Call"}
          </button>
        </div>
      )}

      {/* Incoming call - compact */}
      {status === "incoming" && call && (
        <div className="text-center">
          <p className="text-sm font-semibold mb-2">
            📞 {call.parameters.From}
          </p>
          <div className="flex gap-2">
            <button
              onClick={answerCall}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-3 rounded-lg text-sm"
            >
              Answer
            </button>
            <button
              onClick={hangUp}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 rounded-lg text-sm"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Active call controls - compact */}
      {(status === "connecting" || status === "connected") && (
        <div>
          <div className="text-center mb-2">
            {status === "connecting" && (
              <p className="text-sm">Connecting...</p>
            )}
            {status === "connected" && (
              <p className="text-sm font-semibold text-green-600">Connected</p>
            )}
          </div>

          {/* Call controls - single row */}
          <div className="flex gap-2">
            <button
              onClick={toggleMute}
              className={`flex-1 p-2 rounded-lg font-semibold text-xs transition-colors ${
                muted
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }`}
            >
              {muted ? "🔇" : "🔊"}
            </button>
            
            <button
              onClick={hangUp}
              className="flex-1 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-xs"
            >
              📞 End
            </button>

            <button
              onClick={() => {
                const digit = prompt("Enter digit (0-9, *, #):");
                if (digit) sendDigit(digit);
              }}
              className="flex-1 p-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold text-xs"
            >
              🔢
            </button>
          </div>
        </div>
      )}

      {/* Setup instructions - compact */}
      {status === "error" && error?.includes("not configured") && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
          <h4 className="font-semibold mb-1">Setup Required:</h4>
          <ol className="list-decimal list-inside space-y-0.5 text-gray-700">
            <li>Create TwiML App in Twilio Console</li>
            <li>Add TWILIO_API_KEY/SECRET to .env</li>
            <li>Add TWILIO_TWIML_APP_SID to .env</li>
          </ol>
        </div>
      )}
    </div>
  );
}

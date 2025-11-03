"use client";

import { useState } from "react";
import VoiceCall from "./VoiceCall";

interface CallSmsToggleProps {
  phoneNumber?: string;
  onSendSms?: (message: string) => void;
}

export default function CallSmsToggle({ phoneNumber, onSendSms }: CallSmsToggleProps) {
  const [mode, setMode] = useState<"sms" | "call">("sms");
  const [smsMessage, setSmsMessage] = useState("");

  function handleSendSms() {
    if (smsMessage.trim() && onSendSms) {
      onSendSms(smsMessage);
      setSmsMessage("");
    }
  }

  return (
    <div className="call-sms-widget">
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("sms")}
          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
            mode === "sms"
              ? "bg-blue-500 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          💬 Text Message
        </button>
        <button
          onClick={() => setMode("call")}
          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
            mode === "call"
              ? "bg-green-500 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          📞 Voice Call
        </button>
      </div>

      {/* SMS Mode */}
      {mode === "sms" && (
        <div className="sms-mode">
          <textarea
            value={smsMessage}
            onChange={(e) => setSmsMessage(e.target.value)}
            placeholder="Type your message..."
            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
          />
          <button
            onClick={handleSendSms}
            disabled={!smsMessage.trim() || !phoneNumber}
            className="mt-2 w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Send SMS
          </button>
          {!phoneNumber && (
            <p className="mt-2 text-sm text-gray-500 text-center">
              Select a contact with a phone number
            </p>
          )}
        </div>
      )}

      {/* Voice Call Mode */}
      {mode === "call" && (
        <div className="call-mode">
          <VoiceCall 
            phoneNumber={phoneNumber} 
            onCallEnd={() => setMode("sms")}
          />
        </div>
      )}
    </div>
  );
}

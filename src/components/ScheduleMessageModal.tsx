"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function ScheduleMessageModal({
  contact,
  channel,
  open,
  onClose,
}: {
  contact: any;
  channel: "sms" | "whatsapp" | "email";
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [quickOption, setQuickOption] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const scheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/scheduled-simple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData.message || "Failed to schedule message");
      }
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled"] });
      queryClient.invalidateQueries({ queryKey: ["scheduled-simple"] });
      onClose();
      setContent("");
      setSubject("");
      setScheduledFor("");
      setError(null);
    },
    onError: (err: any) => {
      setError(err.message);
    },
  });

  const handleQuickSchedule = (option: string) => {
    const now = new Date();
    let scheduledDate = new Date();

    switch (option) {
      case "1hour":
        scheduledDate.setHours(now.getHours() + 1);
        break;
      case "3hours":
        scheduledDate.setHours(now.getHours() + 3);
        break;
      case "tomorrow":
        scheduledDate.setDate(now.getDate() + 1);
        scheduledDate.setHours(9, 0, 0, 0);
        break;
      case "3days":
        scheduledDate.setDate(now.getDate() + 3);
        scheduledDate.setHours(9, 0, 0, 0);
        break;
      case "1week":
        scheduledDate.setDate(now.getDate() + 7);
        scheduledDate.setHours(9, 0, 0, 0);
        break;
    }

    setScheduledFor(scheduledDate.toISOString().slice(0, 16));
    setQuickOption(option);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() || !scheduledFor) return;

    scheduleMutation.mutate({
      contactId: contact.id,
      channel,
      content,
      subject: channel === "email" ? subject : undefined,
      scheduledFor,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-50" onClick={onClose} />
      <div className="bg-gray-900 rounded-lg z-10 w-full max-w-2xl p-6">
        <h2 className="text-xl font-bold mb-4">Schedule Message</h2>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              To: {contact.name || contact.phone || contact.email}
            </label>
            <div className="text-xs text-gray-400">
              Channel: <span className="capitalize">{channel}</span>
            </div>
          </div>

          {channel === "email" && (
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Subject
              </label>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded px-3 py-2 bg-gray-800 text-white border border-gray-700"
                placeholder="Email subject"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Message
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded px-3 py-2 bg-gray-800 text-white border border-gray-700 min-h-[100px]"
              placeholder="Type your message..."
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Quick Schedule
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { value: "1hour", label: "In 1 hour" },
                { value: "3hours", label: "In 3 hours" },
                { value: "tomorrow", label: "Tomorrow 9 AM" },
                { value: "3days", label: "In 3 days" },
                { value: "1week", label: "In 1 week" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleQuickSchedule(opt.value)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    quickOption === opt.value
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-300 mb-2 block">
              Or Pick Custom Date/Time
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => {
                setScheduledFor(e.target.value);
                setQuickOption("");
              }}
              className="w-full rounded px-3 py-2 bg-gray-800 text-white border border-gray-700"
              required
            />
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-600 rounded-lg p-3">
              <p className="text-sm text-red-200">{error}</p>
              {error.includes("migration") && (
                <div className="mt-2 bg-gray-900 rounded p-2 font-mono text-xs">
                  npx prisma migrate dev --name add_scheduling
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={scheduleMutation.isPending}
              className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
            >
              {scheduleMutation.isPending ? "Scheduling..." : "Schedule Message"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

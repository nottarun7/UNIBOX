"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function ScheduledMessagesPanel() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "SENT" | "FAILED">("PENDING");

  const { data, isLoading, error } = useQuery({
    queryKey: ["scheduled-simple", statusFilter],
    queryFn: async () => {
      const res = await fetch(`/api/scheduled-simple?all=${statusFilter !== 'PENDING'}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to fetch scheduled messages");
      }
      return res.json();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/scheduled-simple/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to cancel");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-simple"] });
    },
  });

  const scheduled = data?.scheduled || [];

  // Show migration notice if there's a message
  if (data?.message) {
    return (
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Scheduled Messages</h2>
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-yellow-200 mb-2">Migration Required</h3>
              <p className="text-sm text-gray-300 mb-3">{data.message}</p>
              <div className="bg-gray-900 rounded p-3 font-mono text-sm">
                npx prisma migrate dev --name add_scheduling
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Scheduled Messages</h2>
        <div className="flex gap-2">
          {["PENDING", "SENT", "FAILED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as any)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                statusFilter === status
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {status === "FAILED" ? "FAILED/CANCELLED" : status}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="text-gray-400">Loading...</div>}

      <div className="space-y-3">
        {scheduled
          .filter((msg: any) => {
            // Filter by status
            if (statusFilter === "PENDING") return msg.status === "PENDING" && msg.scheduledAt;
            if (statusFilter === "SENT") return msg.status === "SENT";
            if (statusFilter === "FAILED") return msg.status === "FAILED";
            return true;
          })
          .map((msg: any) => (
          <div key={msg.id} className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="font-medium">{msg.contact?.name || "Unknown Contact"}</div>
                <div className="text-sm text-gray-400">
                  {msg.contact?.phone || msg.contact?.email}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  msg.status === 'PENDING' ? 'bg-yellow-900 text-yellow-200' :
                  msg.status === 'SENT' ? 'bg-green-900 text-green-200' :
                  msg.status === 'FAILED' ? 'bg-red-900 text-red-200' :
                  'bg-gray-700 text-gray-300'
                }`}>
                  {msg.status}
                </span>
                {msg.status === 'PENDING' && (
                  <button
                    onClick={() => cancelMutation.mutate(msg.id)}
                    className="text-xs px-2 py-1 rounded bg-red-900 text-red-200 hover:bg-red-800"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {msg.subject && (
              <div className="text-sm font-medium mb-1">Subject: {msg.subject}</div>
            )}
            
            <div className="text-sm text-gray-300 mb-2">{msg.content}</div>
            
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <div>Channel: <span className="capitalize">{msg.channel}</span></div>
              <div>Scheduled for: {new Date(msg.scheduledFor).toLocaleString()}</div>
              {msg.templateName && <div>Template: {msg.templateName}</div>}
            </div>
          </div>
        ))}

        {scheduled.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-400">
            No {statusFilter.toLowerCase()} scheduled messages
          </div>
        )}
      </div>
    </div>
  );
}

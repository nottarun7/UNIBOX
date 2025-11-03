"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useMessages(contactId?: string, channel?: string) {
  return useQuery({
    queryKey: ["messages", contactId || "all", channel || "any"],
    queryFn: async () => {
      const parts = [] as string[];
      if (contactId) parts.push(`contactId=${encodeURIComponent(contactId)}`);
      if (channel) parts.push(`channel=${encodeURIComponent(channel)}`);
      const qs = parts.length ? `?${parts.join("&")}` : "";
      const res = await fetch(`/api/messages${qs}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const json = await res.json();
      return json.messages as any[];
    },
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to send message' }));
        console.error('Send message API error:', errorData);
        
        // Provide helpful error messages
        let errorMessage = errorData.error || 'Failed to send message';
        if (errorData.error?.includes('publicly accessible') || errorData.error?.includes('Invalid media URL')) {
          errorMessage = '📎 Media upload issue!\n\n' +
            'Twilio needs public URLs.\n\n' +
            'Quick fix:\n' +
            '1. Run: ngrok http 3000\n' +
            '2. Copy the https URL\n' +
            '3. Add to .env: NEXT_PUBLIC_BASE_URL=https://your-url.ngrok.io\n' +
            '4. Restart server\n\n' +
            'See NGROK_SETUP.md for details.';
        }
        
        throw new Error(errorMessage);
      }
      return res.json();
    },
    onMutate: async (newMessage: any) => {
      await qc.cancelQueries({ queryKey: ["messages", newMessage.contactId || "all"] });
      const prev = qc.getQueryData(["messages", newMessage.contactId || "all"]);
      const optimistic = {
        id: `temp-${Date.now()}`,
        content: newMessage.content,
        channel: newMessage.channel,
        direction: "outbound",
        timestamp: new Date().toISOString(),
        contactId: newMessage.contactId,
        status: "PENDING",
      };
      qc.setQueryData(["messages", newMessage.contactId || "all"], (old: any) => [optimistic].concat(old || []));
      return { prev };
    },
    onError: (err: any, newMessage: any, context: any) => {
      qc.setQueryData(["messages", newMessage.contactId || "all"], context?.prev);
    },
    onSettled: (_data: any, _err: any, newMessage: any) => {
      qc.invalidateQueries({ queryKey: ["messages", newMessage.contactId || "all"] });
      qc.invalidateQueries({ queryKey: ["messages", "all"] });
    },
  });
}

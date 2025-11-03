"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useNotes(contactId?: string) {
  return useQuery({
    enabled: !!contactId,
    queryKey: ["notes", contactId || ""],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${encodeURIComponent(contactId || '')}/notes`);
      if (!res.ok) throw new Error("Failed to fetch notes");
      const json = await res.json();
      return json.notes as any[];
    },
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contactId, content, isPrivate, userId }: any) => {
      const res = await fetch(`/api/contacts/${encodeURIComponent(contactId)}/notes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, isPrivate, userId }) });
      if (!res.ok) throw new Error('Failed to create note');
      return res.json();
    },
    onSuccess: (_data, vars: any) => {
      qc.invalidateQueries({ queryKey: ["notes", vars.contactId] });
    }
  });
}

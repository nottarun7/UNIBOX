"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function useThreads() {
  return useQuery({
    queryKey: ["threads"],
    queryFn: async () => {
      const res = await fetch(`/api/threads`);
      if (!res.ok) throw new Error("Failed to fetch threads");
      const json = await res.json();
      return json.threads as any[];
    },
  });
}

export function useMergeContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch(`/api/contacts/merge`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Failed to merge contacts");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["threads"] }),
  });
}

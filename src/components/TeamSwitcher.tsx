"use client";

import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export default function TeamSwitcher() {
  const { data: session, update } = useSession();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/teams");
      if (!res.ok) throw new Error("Failed to fetch teams");
      return res.json();
    },
    enabled: !!session?.user,
  });

  const switchTeamMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const res = await fetch(`/api/teams/${teamId}/switch`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to switch team");
      return res.json();
    },
    onSuccess: () => {
      // Refresh session to get new team context
      update();
      // Invalidate all queries to refetch with new team context
      queryClient.invalidateQueries();
      setIsOpen(false);
    },
  });

  const teams = teamsData?.teams || [];
  const currentTeamId = (session?.user as any)?.teamId;
  const currentTeam = teams.find((t: any) => t.id === currentTeamId);

  if (!session?.user || teams.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">
            {currentTeam?.name?.charAt(0)?.toUpperCase() || "T"}
          </div>
          <span className="text-sm font-medium hidden md:block">
            {currentTeam?.name || "Select Team"}
          </span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-20">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase">
                Your Teams
              </div>
              {teams.map((team: any) => (
                <button
                  key={team.id}
                  onClick={() => switchTeamMutation.mutate(team.id)}
                  disabled={team.id === currentTeamId || switchTeamMutation.isPending}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
                    team.id === currentTeamId
                      ? "bg-indigo-600 text-white"
                      : "hover:bg-gray-700 text-gray-200"
                  } ${switchTeamMutation.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      team.id === currentTeamId ? "bg-indigo-700" : "bg-gray-700"
                    }`}
                  >
                    {team.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{team.name}</div>
                    <div className="text-xs text-gray-400 capitalize">
                      {team.myRole.toLowerCase()}
                    </div>
                  </div>
                  {team.id === currentTeamId && (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-gray-700 p-2">
              <a
                href="/teams"
                className="block w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors"
              >
                + Create New Team
              </a>
              <a
                href="/teams/settings"
                className="block w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-md transition-colors"
              >
                ⚙️ Team Settings
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

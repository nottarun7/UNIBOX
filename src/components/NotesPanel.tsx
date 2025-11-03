"use client";

import { useState } from "react";
import { useNotes, useCreateNote } from "../hooks/useNotes";
import { useSession } from "next-auth/react";

export default function NotesPanel({ contactId }: { contactId: string }) {
  const { data: notes, isLoading } = useNotes(contactId);
  const create = useCreateNote();
  const { data: session } = useSession();
  const [text, setText] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const userId = session?.user?.id as string | undefined;

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault();
    if (!text.trim() || !userId) return;
    try {
      await create.mutateAsync({ contactId, content: text.trim(), isPrivate, userId });
      setText("");
      setIsPrivate(false);
    } catch (err) {
      console.error('Failed to create note', err);
      alert('Failed to create note');
    }
  }

  return (
    <div className="mt-4 border-t pt-4">
      <h3 className="text-sm font-semibold mb-2">Notes</h3>
      {isLoading && <div>Loading notes…</div>}
      {!isLoading && notes && (
        <ul className="space-y-2 max-h-40 overflow-auto">
          {notes.map((n: any) => (
            <li key={n.id} className="p-2 rounded bg-gray-50">
              <div className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</div>
              <div className="mt-1">{n.content}</div>
              <div className="text-xs text-gray-400">{n.isPrivate ? 'Private' : 'Public'}</div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleCreate} className="mt-3">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="w-full border rounded p-2" placeholder="Write a note..." />
        <div className="flex items-center justify-between mt-2">
          <label className="text-sm">
            <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="mr-2" /> Private
          </label>
          <button className="bg-gray-800 text-white px-3 py-1 rounded">Add Note</button>
        </div>
      </form>
    </div>
  );
}

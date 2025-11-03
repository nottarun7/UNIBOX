"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type ViewMode = 'profile' | 'edit';
type TabType = 'timeline' | 'notes' | 'details';

export default function ContactProfileModal({ 
  contact, 
  open, 
  onClose, 
  onSaved 
}: { 
  contact: any; 
  open: boolean; 
  onClose: () => void; 
  onSaved: (updated: any) => void; 
}) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('profile');
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  
  // Edit form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Note form state
  const [noteContent, setNoteContent] = useState("");
  const [noteIsPrivate, setNoteIsPrivate] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  // Fetch timeline
  const { data: timelineData, isLoading: timelineLoading } = useQuery({
    queryKey: ['contact-timeline', contact?.id],
    queryFn: async () => {
      const res = await fetch(`/api/contacts/${contact.id}/timeline`);
      if (!res.ok) throw new Error('Failed to fetch timeline');
      return res.json();
    },
    enabled: open && !!contact?.id,
  });

  // Reset form when contact changes
  useEffect(() => {
    if (open && contact) {
      setName(contact.name ?? "");
      setPhone(contact.phone ?? "");
      setWhatsapp(contact.whatsapp ?? "");
      setEmail(contact.email ?? "");
      setError(null);
      setViewMode('profile');
      setActiveTab('timeline');
    }
  }, [open, contact]);

  // Save contact mutation
  const saveContact = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${encodeURIComponent(contact.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, whatsapp, email }),
      });
      const json = await res.json();
      if (!res.ok) {
        const message = json?.error || 'Failed to save contact';
        setError(message);
        return;
      }
      onSaved(json.contact);
      setViewMode('profile');
      queryClient.invalidateQueries({ queryKey: ['contact-timeline', contact.id] });
    } catch (err: any) {
      console.error("Contact save error", err);
      setError(err?.message || 'Failed to save contact');
    } finally {
      setLoading(false);
    }
  };

  // Add note mutation
  const addNote = async () => {
    if (!noteContent.trim()) return;
    
    setAddingNote(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contact.id,
          content: noteContent,
          isPrivate: noteIsPrivate,
        }),
      });
      if (!res.ok) throw new Error('Failed to add note');
      
      setNoteContent('');
      setNoteIsPrivate(false);
      queryClient.invalidateQueries({ queryKey: ['contact-timeline', contact.id] });
    } catch (err) {
      console.error('Add note error:', err);
    } finally {
      setAddingNote(false);
    }
  };

  // Delete note mutation
  const deleteNote = async (noteId: string) => {
    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete note');
      queryClient.invalidateQueries({ queryKey: ['contact-timeline', contact.id] });
    } catch (err) {
      console.error('Delete note error:', err);
    }
  };

  if (!open) return null;

  const timeline = timelineData?.timeline || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-50" onClick={onClose} />
      <div className="bg-gray-900 rounded-lg z-10 w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 bg-gray-900">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{contact.name || 'Unknown Contact'}</h2>
              <div className="mt-2 space-y-1 text-sm text-gray-400">
                {contact.phone && <div>📱 {contact.phone}</div>}
                {contact.whatsapp && <div>💬 {contact.whatsapp}</div>}
                {contact.email && <div>📧 {contact.email}</div>}
              </div>
            </div>
            <div className="flex gap-2">
              {viewMode === 'profile' ? (
                <>
                  <button
                    onClick={() => setViewMode('edit')}
                    className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
                  >
                    Close
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setViewMode('profile')}
                    className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveContact}
                    disabled={loading}
                    className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'profile' ? (
            <>
              {/* Tabs */}
              <div className="border-b border-gray-700 px-6">
                <div className="flex gap-4">
                  <button
                    onClick={() => setActiveTab('timeline')}
                    className={`py-3 px-2 border-b-2 transition-colors ${
                      activeTab === 'timeline'
                        ? 'border-indigo-500 text-white'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    Timeline
                  </button>
                  <button
                    onClick={() => setActiveTab('notes')}
                    className={`py-3 px-2 border-b-2 transition-colors ${
                      activeTab === 'notes'
                        ? 'border-indigo-500 text-white'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    Notes
                  </button>
                  <button
                    onClick={() => setActiveTab('details')}
                    className={`py-3 px-2 border-b-2 transition-colors ${
                      activeTab === 'details'
                        ? 'border-indigo-500 text-white'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    Details
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {activeTab === 'timeline' && (
                  <div className="space-y-4">
                    {timelineLoading ? (
                      <div className="text-center text-gray-400 py-8">Loading timeline...</div>
                    ) : timeline.length === 0 ? (
                      <div className="text-center text-gray-400 py-8">No activity yet</div>
                    ) : (
                      timeline.map((item: any) => (
                        <div key={item.id} className="bg-gray-800 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {item.type === 'message' ? (
                                <>
                                  <span className="text-xl">
                                    {item.channel === 'sms' ? '📱' : '💬'}
                                  </span>
                                  <span className={`text-xs px-2 py-1 rounded ${
                                    item.direction === 'inbound' 
                                      ? 'bg-green-900 text-green-200' 
                                      : 'bg-blue-900 text-blue-200'
                                  }`}>
                                    {item.direction === 'inbound' ? 'Received' : 'Sent'}
                                  </span>
                                  {item.status && item.direction === 'outbound' && (
                                    <span className="text-xs text-gray-400">
                                      {item.status}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span className="text-xl">📝</span>
                                  <span className="text-xs px-2 py-1 rounded bg-purple-900 text-purple-200">
                                    Note
                                  </span>
                                  {item.isPrivate && (
                                    <span className="text-xs px-2 py-1 rounded bg-red-900 text-red-200">
                                      Private
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                            <span className="text-xs text-gray-400">
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm whitespace-pre-wrap">{item.content}</div>
                          {item.user && (
                            <div className="text-xs text-gray-400 mt-2">
                              By {item.user.name || item.user.email}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div className="space-y-4">
                    {/* Add Note Form */}
                    <div className="bg-gray-800 rounded-lg p-4">
                      <textarea
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                        placeholder="Add a note..."
                        className="w-full bg-gray-900 text-white rounded px-3 py-2 border border-gray-700 min-h-[100px]"
                      />
                      <div className="flex items-center justify-between mt-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={noteIsPrivate}
                            onChange={(e) => setNoteIsPrivate(e.target.checked)}
                            className="rounded"
                          />
                          <span>Private (only visible to you)</span>
                        </label>
                        <button
                          onClick={addNote}
                          disabled={addingNote || !noteContent.trim()}
                          className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                        >
                          {addingNote ? 'Adding...' : 'Add Note'}
                        </button>
                      </div>
                    </div>

                    {/* Notes List */}
                    {timeline
                      .filter((item: any) => item.type === 'note')
                      .map((note: any) => (
                        <div key={note.id} className="bg-gray-800 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">📝</span>
                              {note.isPrivate && (
                                <span className="text-xs px-2 py-1 rounded bg-red-900 text-red-200">
                                  Private
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">
                                {new Date(note.timestamp).toLocaleString()}
                              </span>
                              <button
                                onClick={() => deleteNote(note.id)}
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="text-sm whitespace-pre-wrap">{note.content}</div>
                          {note.user && (
                            <div className="text-xs text-gray-400 mt-2">
                              By {note.user.name || note.user.email}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}

                {activeTab === 'details' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-400 mb-3">Contact Information</h3>
                      <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Name</div>
                          <div>{contact.name || 'Not set'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Phone</div>
                          <div>{contact.phone || 'Not set'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">WhatsApp</div>
                          <div>{contact.whatsapp || 'Not set'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Email</div>
                          <div>{contact.email || 'Not set'}</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-gray-400 mb-3">Statistics</h3>
                      <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Messages</span>
                          <span className="font-semibold">
                            {timeline.filter((t: any) => t.type === 'message').length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Notes</span>
                          <span className="font-semibold">
                            {timeline.filter((t: any) => t.type === 'note').length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Contact ID</span>
                          <span className="font-mono text-xs text-gray-400">{contact.id}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Edit Mode */
            <div className="p-6 bg-gray-800">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded px-3 py-2 bg-gray-900 text-white border border-gray-700"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Phone</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded px-3 py-2 bg-gray-900 text-white border border-gray-700"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">WhatsApp</label>
                  <input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="w-full rounded px-3 py-2 bg-gray-900 text-white border border-gray-700"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@example.com"
                    className="w-full rounded px-3 py-2 bg-gray-900 text-white border border-gray-700"
                  />
                </div>
                {error && <div className="text-sm text-red-400 mt-2">{error}</div>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

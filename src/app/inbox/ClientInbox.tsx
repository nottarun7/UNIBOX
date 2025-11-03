"use client";

import { useState, useRef, useEffect } from "react";
import Composer from "../../components/Composer";
import { useMessages } from "../../hooks/useMessages";
import { useThreads, useMergeContacts } from "../../hooks/useThreads";
import NotesPanel from "../../components/NotesPanel";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// Header is rendered in RootLayout
import ContactProfileModal from "../../components/ContactProfileModal";
import EmailMessage from "../../components/EmailMessage";
import VoiceCall from "../../components/VoiceCall";
import NewContactModal from "../../components/NewContactModal";

export default function ClientInbox() {
  const [activeContactId, setActiveContactId] = useState<string | undefined>(undefined);
  const [selectedChannel, setSelectedChannel] = useState<string | undefined>(undefined);
  const { data: threads, isLoading: threadsLoading } = useThreads();
  const merge = useMergeContacts();
  const { data: messages, isLoading: messagesLoading } = useMessages(activeContactId, selectedChannel);
  // Keep a local selectedContact object so the Composer doesn't depend on threads still containing the contact
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [editingContact, setEditingContact] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newContactModalOpen, setNewContactModalOpen] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const qc = useQueryClient();
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "scheduled">("all");

  // Mark messages as read when contact is selected
  useEffect(() => {
    if (activeContactId) {
      fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId: activeContactId }),
      }).then(() => {
        // Refresh threads to update unread counts
        qc.invalidateQueries({ queryKey: ['threads'] });
      });
    }
  }, [activeContactId, qc]);

  // Filter threads based on search and status
  const filteredThreads = threads?.filter((t: any) => {
    // Search filter
    const matchesSearch = !searchQuery || 
      (t.contact.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.contact.phone?.includes(searchQuery)) ||
      (t.contact.whatsapp?.includes(searchQuery));
    
    // Status filter
    const hasUnread = t.lastMessage?.direction === 'inbound' && t.unreadCount > 0;
    const matchesStatus = 
      statusFilter === "all" ? true :
      statusFilter === "unread" ? hasUnread :
      false; // scheduled not implemented yet
    
    return matchesSearch && matchesStatus;
  });

  // Auto-scroll to bottom whenever messages change (newest messages at bottom)
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const t = setTimeout(() => {
      el.scrollTop = el.scrollHeight;
    }, 50);
    return () => clearTimeout(t);
  }, [messages?.length]);

  return (
    <div className="h-screen overflow-hidden flex flex-col">

      <main className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-hidden">
        {/* Left: Contacts / threads list */}
        <section className="col-span-3 panel rounded-lg p-4 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Contacts</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setNewContactModalOpen(true)}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold transition-colors"
                title="Add new contact"
              >
                + New
              </button>
              <div className="text-xs muted">{filteredThreads?.length || 0}</div>
            </div>
          </div>

          {/* Status filter tabs */}
          <div className="flex gap-2 mb-3">
            <button 
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 rounded text-xs transition-colors ${statusFilter === "all" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
            >
              All
            </button>
            <button 
              onClick={() => setStatusFilter("unread")}
              className={`px-3 py-1 rounded text-xs transition-colors ${statusFilter === "unread" ? "bg-indigo-600 text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
            >
              Unread
            </button>
          </div>

          {/* Search box */}
          <div className="mb-3">
            <input 
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded px-3 py-2 text-sm bg-gray-900 text-white border border-gray-700 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div className="overflow-auto flex-1">
            <div className="flex flex-col gap-2">
              {threadsLoading && <div className="muted">Loading…</div>}
              {filteredThreads && filteredThreads.map((t: any) => {
                const unreadCount = t.unreadCount || 0;
                return (
                <div key={t.contact.id} className={`thread-card ${t.contact.id === activeContactId ? 'bg-indigo-900' : ''}`}>
                  <div className="flex-1 cursor-pointer" onClick={() => { setActiveContactId(t.contact.id); setSelectedContact(t.contact); }}>
                    <div className="avatar">{(t.contact.name || t.contact.phone || 'U').slice(0,2).toUpperCase()}</div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-sm font-medium">{t.contact.name ?? 'Unknown'}</div>
                          <div className="text-xs muted">{t.contact.phone ?? t.contact.whatsapp ?? ''}</div>
                        </div>
                        <div className="text-xs muted">{t.lastMessage ? new Date(t.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                      </div>
                      <div className="text-xs muted mt-1 truncate">{t.lastMessage ? t.lastMessage.content : 'No messages yet'}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-semibold">
                        {unreadCount}
                      </span>
                    )}
                    {!t.contact.name ? (
                      <button className="text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500" onClick={(e) => { e.stopPropagation(); setEditingContact(t.contact); setModalOpen(true); }}>Save</button>
                    ) : (
                      <button className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600" onClick={(e) => { e.stopPropagation(); setEditingContact(t.contact); setModalOpen(true); }}>Edit</button>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        </section>

  {/* Middle: Channels / filters (thinner) */}
  <section className="col-span-2 panel rounded-lg p-4 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Channels</h3>
          </div>
          <div className="flex-1 overflow-auto">
            <div className="flex flex-col gap-2">
              {['whatsapp', 'sms', 'email'].map((ch) => {
                const count = filteredThreads?.filter((t: any) => t.lastMessage?.channel === ch).length || 0;
                const unreadCount = filteredThreads?.filter((t: any) => t.lastMessage?.channel === ch && t.lastMessage?.direction === 'inbound' && t.unreadCount > 0).length || 0;
                return (
                  <div key={ch} className={`channel-card ${selectedChannel === ch ? 'active' : ''}`} onClick={() => { setSelectedChannel(ch); }}>
                    <div className="w-10 h-10 flex items-center justify-center rounded-md bg-gradient-to-br from-gray-800 to-gray-700">
                      {ch === 'whatsapp' ? 'WA' : ch === 'sms' ? 'SMS' : 'EM'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium capitalize">{ch}</div>
                      <div className="text-xs muted">{count} threads{unreadCount > 0 && ` · ${unreadCount} unread`}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

  {/* Right: Conversation view (chat) - wider */}
  <section className="col-span-7 panel rounded-lg p-4 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-semibold">
                  {selectedContact ? (selectedContact.name ?? 'Conversation') : activeContactId ? (threads?.find((tt: any) => tt.contact.id === activeContactId)?.contact.name ?? 'Conversation') : (selectedChannel ? `${selectedChannel} feed` : 'Conversation')}
                </div>
                <div className="text-xs muted">{selectedContact ? (selectedContact.phone ?? selectedContact.whatsapp ?? '') : ''}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-xs muted">{selectedChannel ?? 'All channels'}</div>
              {/* Call button - show when contact has a phone number */}
              {selectedContact && (selectedContact.phone || selectedContact.whatsapp) && (
                <button
                  onClick={() => setShowVoiceCall(!showVoiceCall)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                    showVoiceCall
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-gray-700 hover:bg-gray-600 text-white"
                  }`}
                  title="Make a voice call"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {showVoiceCall ? "Hide Call" : "Call"}
                </button>
              )}
            </div>
          </div>

          {/* Voice Call Widget */}
          {showVoiceCall && selectedContact && (
            <div className="mb-4">
              <VoiceCall 
                phoneNumber={selectedContact.phone || selectedContact.whatsapp}
                onCallEnd={() => setShowVoiceCall(false)}
              />
            </div>
          )}

          <div ref={chatScrollRef} className="flex-1 overflow-auto mb-4">
            {messagesLoading && <div className="muted">Loading messages…</div>}
            {!messagesLoading && messages && (
              <>
                {selectedChannel === 'email' ? (
                  /* Gmail-style email view */
                  <div className="bg-gray-900 rounded-lg overflow-hidden">
                    {messages.map((m: any) => (
                      <EmailMessage key={m.id} message={m} />
                    ))}
                    {messages.length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        No emails yet
                      </div>
                    )}
                  </div>
                ) : (
                  /* Regular chat view for SMS/WhatsApp */
                  <div className="msg-list flex flex-col gap-3">
                    {messages.map((m: any) => (
                      <div key={m.id} className={`msg-bubble ${m.direction === 'inbound' ? 'msg-inbound' : 'msg-outbound'}`}>
                        <div className="text-xs muted">{new Date(m.timestamp).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        {m.mediaUrls && m.mediaUrls.length > 0 && (
                          <div className="flex gap-2 flex-wrap mt-2">
                            {m.mediaUrls.map((url: string, idx: number) => {
                              console.log('Rendering message image:', url);
                              return (
                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
                                  <img 
                                    src={url} 
                                    alt="attachment" 
                                    className="max-w-xs max-h-48 rounded border border-gray-700 hover:opacity-80 transition-opacity"
                                    onError={(e) => console.error('Message image failed to load:', url, e)}
                                    onLoad={() => console.log('Message image loaded:', url)}
                                  />
                                </a>
                              );
                            })}
                          </div>
                        )}
                        <div className="mt-1">{m.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            {selectedContact && selectedChannel ? (
              // Both contact and channel selected: show full composer
              <Composer 
                contact={selectedContact} 
                defaultTo={
                  selectedChannel === 'sms'
                    ? (selectedContact.phone ?? selectedContact.whatsapp ?? '')
                    : (selectedContact.whatsapp ?? selectedContact.phone ?? '')
                } 
                channel={selectedChannel as any} 
              />
            ) : selectedContact && !selectedChannel ? (
              // Contact selected but no channel: prompt user to select channel
              <div className="text-sm muted">Select a channel (SMS or WhatsApp) from the middle column to start messaging.</div>
            ) : !selectedContact && selectedChannel ? (
              // Channel selected but no contact: prompt user to select contact
              <div className="text-sm muted">Select a contact from the left column to start a conversation.</div>
            ) : (
              // Nothing selected
              <div className="text-sm muted">Select a contact and a channel to start a conversation.</div>
            )}
          </div>
        </section>
        
        {/* Modals */}
        <ContactProfileModal 
          contact={editingContact} 
          open={modalOpen} 
          onClose={() => { setModalOpen(false); setEditingContact(null); }} 
          onSaved={(updated) => { qc.invalidateQueries({ queryKey: ["threads"] }); }} 
        />
        
        <NewContactModal
          open={newContactModalOpen}
          onClose={() => setNewContactModalOpen(false)}
          onContactCreated={(contact) => {
            // Refresh threads list
            qc.invalidateQueries({ queryKey: ["threads"] });
            // Auto-select the new contact
            setActiveContactId(contact.id);
            setSelectedContact(contact);
            // Determine default channel
            const defaultChannel = contact.email ? 'email' : contact.phone ? 'sms' : contact.whatsapp ? 'whatsapp' : 'sms';
            setSelectedChannel(defaultChannel);
          }}
        />
      </main>
    </div>
  );
}

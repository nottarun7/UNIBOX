"use client";

import { useState, useEffect, useRef } from "react";
import { useSendMessage } from "../hooks/useMessages";
import ScheduleMessageModal from "./ScheduleMessageModal";

export default function Composer({ contact, defaultTo, channel: channelProp }: { contact?: any; defaultTo?: string; channel?: "sms" | "whatsapp" | "email" }) {
  const [content, setContent] = useState("");
  const [to, setTo] = useState(defaultTo || "");
  const [channel, setChannel] = useState<"sms" | "whatsapp" | "email">(channelProp || "sms");
  const [subject, setSubject] = useState(""); // For email
  const [attachments, setAttachments] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendMsg = useSendMessage();

  // Keep `to` and `channel` in sync when `contact`, `defaultTo` or `channelProp` change.
  useEffect(() => {
    if (contact && channelProp) {
      // Contact and channel selected: auto-fill destination based on channel
      setChannel(channelProp as any);
      const toVal = channelProp === 'sms' 
        ? (contact.phone ?? contact.whatsapp ?? '') 
        : channelProp === 'email'
        ? (contact.email ?? '')
        : (contact.whatsapp ?? contact.phone ?? '');
      setTo(toVal);
    } else if (contact && !channelProp) {
      // Contact selected but no channel from parent: pick first available
      const preferred = contact.email ? 'email' : contact.phone ? 'sms' : (contact.whatsapp ? 'whatsapp' : 'sms');
      setChannel(preferred as any);
      const toVal = preferred === 'email' ? (contact.email ?? '') : preferred === 'sms' ? (contact.phone ?? contact.whatsapp ?? '') : (contact.whatsapp ?? contact.phone ?? '');
      setTo(toVal);
    } else {
      // No contact: reset to defaults
      setChannel((channelProp as any) || 'sms');
      setTo(defaultTo || '');
    }
  }, [contact, defaultTo, channelProp]);

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    if (!content.trim() && attachments.length === 0) return;
    if (contact && !to) {
      alert('No destination for this contact. Please edit the contact to add an email/phone number.');
      return;
    }
    try {
      console.log('Sending message with payload:', { 
        contactId: contact?.id, 
        to, 
        channel, 
        content,
        subject: channel === 'email' ? subject : undefined,
        mediaUrls: attachments.length > 0 ? attachments : undefined
      });
      await sendMsg.mutateAsync({ 
        contactId: contact?.id, 
        to, 
        channel, 
        content,
        subject: channel === 'email' ? subject : undefined,
        mediaUrls: attachments.length > 0 ? attachments : undefined
      });
      setContent("");
      setSubject("");
      setAttachments([]);
    } catch (err) {
      console.error("Send failed", err);
      alert("Failed to send message");
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        alert(error.error || 'Upload failed');
        return;
      }

      const data = await res.json();
      setAttachments(prev => [...prev, data.url]);
      console.log('✅ Upload successful:', data);
      console.log('Preview URL:', data.url);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function removeAttachment(url: string) {
    setAttachments(prev => prev.filter(u => u !== url));
  }

  return (
    <form onSubmit={handleSend} className="mt-4 bg-transparent">
      <div className="flex gap-2 mb-2 items-center">
        {contact ? (
          <div className="flex items-center gap-3 flex-wrap w-full">
            {/* If a channel is provided from the parent (conversation mode), don't show channel buttons or inputs — keep UI minimal. */}
            {channelProp ? (
              <>
                <div className="text-sm muted">Sending to: <span className="text-white">{to || (channel === 'email' ? 'no email' : 'no number')}</span></div>
                {channel === 'email' && !contact.email && (
                  <div className="text-xs muted">No email on file — please edit contact to add one.</div>
                )}
                {channel !== 'email' && (!contact.phone && !contact.whatsapp) && (
                  <div className="text-xs muted">No number on file — please edit contact to add one.</div>
                )}
              </>
            ) : (
              <>
                {/* Channel picker for contact-level send */}
                {contact.phone ? (
                  <button type="button" onClick={() => { setChannel('sms'); setTo(contact.phone || ''); }} className={`px-3 py-1 rounded ${channel === 'sms' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-white'}`}>SMS</button>
                ) : null}
                {(contact.whatsapp || contact.phone) ? (
                  <button type="button" onClick={() => { setChannel('whatsapp'); setTo(contact.whatsapp || contact.phone || ''); }} className={`px-3 py-1 rounded ${channel === 'whatsapp' ? 'bg-green-600 text-white' : 'bg-gray-800 text-white'}`}>WhatsApp</button>
                ) : null}
                {contact.email ? (
                  <button type="button" onClick={() => { setChannel('email'); setTo(contact.email || ''); }} className={`px-3 py-1 rounded ${channel === 'email' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-white'}`}>Email</button>
                ) : null}
                
                {/* Show input field if email is selected but no email exists */}
                {channel === 'email' && !contact.email ? (
                  <input 
                    value={to} 
                    onChange={(e) => setTo(e.target.value)} 
                    placeholder="Enter email address" 
                    className="flex-1 rounded px-3 py-2 bg-gray-900 text-white border border-gray-700"
                  />
                ) : (
                  <div className="text-sm muted">Sending to: <span className="text-white">{to || (channel === 'email' ? 'no email' : 'no number')}</span></div>
                )}
                
                {channel === 'email' && !contact.email && (
                  <div className="text-xs muted">No email on file — please edit contact to add one.</div>
                )}
                {channel !== 'email' && (!contact.phone && !contact.whatsapp) && (
                  <div className="text-xs muted">No number on file — please edit contact to add one.</div>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            {!channelProp && (
              <select value={channel} onChange={(e) => setChannel(e.target.value as any)} className="rounded px-2 bg-gray-800 text-white border border-gray-700">
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
              </select>
            )}
            <input value={to} onChange={(e) => setTo(e.target.value)} placeholder={channel === 'email' ? 'Email address' : 'Phone (+1555...)'} className="flex-1 rounded px-3 py-2 bg-gray-900 text-white border border-gray-700" />
          </>
        )}
      </div>
      
      {/* Subject field for email */}
      {channel === 'email' && (
        <div className="mb-2">
          <input 
            value={subject} 
            onChange={(e) => setSubject(e.target.value)} 
            placeholder="Subject" 
            className="w-full rounded px-3 py-2 bg-gray-900 text-white border border-gray-700" 
          />
        </div>
      )}
      
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {attachments.map((url, idx) => {
            console.log('Rendering preview for:', url);
            return (
              <div key={idx} className="relative group">
                <img 
                  src={url} 
                  alt="attachment" 
                  className="h-20 w-20 object-cover rounded border border-gray-700"
                  onError={(e) => {
                    console.error('Image failed to load:', url);
                    console.error('Error:', e);
                  }}
                  onLoad={() => console.log('Image loaded successfully:', url)}
                />
                <button
                  type="button"
                  onClick={() => removeAttachment(url)}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
      
      <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} className="w-full rounded p-3 bg-gray-900 text-white border border-gray-700" placeholder="Write a message..." />
      <div className="flex justify-between items-center mt-2">
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-white disabled:opacity-50 flex items-center gap-2"
          >
            <span>{uploading ? '⏳' : '📎'}</span>
            <span className="text-sm">{uploading ? 'Uploading...' : 'Attach'}</span>
          </button>
          {contact && (
            <button
              type="button"
              onClick={() => setScheduleModalOpen(true)}
              className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-white flex items-center gap-2"
            >
              <span>⏰</span>
              <span className="text-sm">Schedule</span>
            </button>
          )}
          <div className="text-sm muted">Channel: <span className="text-white">{channel}</span></div>
        </div>
        <div>
          <button type="submit" disabled={!!(contact && !to)} className={`px-4 py-2 rounded ${contact && !to ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>Send</button>
        </div>
      </div>

      {contact && (
        <ScheduleMessageModal
          contact={contact}
          channel={channel}
          open={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
        />
      )}
    </form>
  );
}

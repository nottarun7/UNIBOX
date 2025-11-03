"use client";

import { useState, useEffect } from "react";

export default function ContactEditModal({ contact, open, onClose, onSaved }: { contact: any; open: boolean; onClose: () => void; onSaved: (updated: any) => void; }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // reset fields when contact changes / modal opens
  useEffect(() => {
    if (open && contact) {
      setName(contact.name ?? "");
      setPhone(contact.phone ?? "");
      setWhatsapp(contact.whatsapp ?? "");
      setError(null);
    }
  }, [open, contact]);

  if (!open) return null;

  async function save() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${encodeURIComponent(contact.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, whatsapp }),
      });
      const json = await res.json();
      if (!res.ok) {
        const message = json?.error || 'Failed to save contact';
        setError(message);
        return;
      }
      onSaved(json.contact);
      onClose();
    } catch (err: any) {
      console.error("Contact save error", err);
      setError(err?.message || 'Failed to save contact');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-50" onClick={onClose} />
      <div className="bg-panel rounded-lg p-6 z-10 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-3">Edit contact</h3>
        <div className="flex flex-col gap-2">
          <label className="text-xs muted">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded px-3 py-2 bg-gray-900 text-white border border-gray-700" />
          <label className="text-xs muted">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded px-3 py-2 bg-gray-900 text-white border border-gray-700" />
          <label className="text-xs muted">WhatsApp</label>
          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full rounded px-3 py-2 bg-gray-900 text-white border border-gray-700" />
          {error && <div className="text-sm text-red-400 mt-2">{error}</div>}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded bg-gray-700">Cancel</button>
          <button onClick={save} disabled={loading} className="px-4 py-2 rounded bg-indigo-600 text-white">{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

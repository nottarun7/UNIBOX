"use client";

import { useState } from "react";

interface NewContactModalProps {
  open: boolean;
  onClose: () => void;
  onContactCreated: (contact: any) => void;
}

export default function NewContactModal({ open, onClose, onContactCreated }: NewContactModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [channel, setChannel] = useState<"sms" | "whatsapp" | "email">("sms");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    if (!phone && !whatsapp && !email) {
      setError("At least one contact method (phone, WhatsApp, or email) is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      // Create contact
      const contactRes = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          whatsapp: whatsapp.trim() || null,
          email: email.trim() || null,
        }),
      });

      if (!contactRes.ok) {
        const data = await contactRes.json();
        throw new Error(data.error || "Failed to create contact");
      }

      const newContact = await contactRes.json();

      // If message provided, send it
      if (message.trim()) {
        const to = channel === "email" 
          ? email 
          : channel === "whatsapp" 
          ? whatsapp 
          : phone;

        if (!to) {
          throw new Error(`No ${channel} address provided`);
        }

        const messageRes = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contactId: newContact.contact.id,
            channel,
            to,
            content: message.trim(),
            subject: channel === "email" ? `Message from ${name}` : undefined,
          }),
        });

        if (!messageRes.ok) {
          const data = await messageRes.json();
          throw new Error(data.error || "Failed to send message");
        }
      }

      onContactCreated(newContact.contact);
      resetForm();
      onClose();
    } catch (err: any) {
      console.error("Error creating contact:", err);
      setError(err.message || "Failed to create contact");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setName("");
    setPhone("");
    setWhatsapp("");
    setEmail("");
    setChannel("sms");
    setMessage("");
    setError("");
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">New Contact</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Contact Methods */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Contact Methods <span className="text-gray-500 text-xs">(at least one required)</span>
            </label>
            
            <div>
              <label className="block text-xs text-gray-600 mb-1">Phone (SMS)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1234567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">WhatsApp</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+1234567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Send Initial Message (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Send Initial Message <span className="text-gray-500 text-xs">(optional)</span>
            </label>
            
            {/* Channel Selection */}
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setChannel("sms")}
                disabled={!phone}
                className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  channel === "sms"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                SMS
              </button>
              <button
                type="button"
                onClick={() => setChannel("whatsapp")}
                disabled={!whatsapp}
                className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  channel === "whatsapp"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setChannel("email")}
                disabled={!email}
                className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  channel === "email"
                    ? "bg-purple-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Email
              </button>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Type a message to send via ${channel}...`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={saving}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Creating..." : message ? "Create & Send" : "Create Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

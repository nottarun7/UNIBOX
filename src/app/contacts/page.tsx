"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import ContactProfileModal from "../../components/ContactProfileModal";

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["all-contacts"],
    queryFn: async () => {
      const res = await fetch("/api/contacts");
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    },
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/contacts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete contact");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-contacts"] });
    },
  });

  const filteredContacts = contacts?.contacts?.filter((c: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(query) ||
      c.phone?.includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.whatsapp?.includes(query)
    );
  }) || [];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Contacts</h1>
          <div className="text-sm text-gray-400">
            {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md rounded px-4 py-2 bg-gray-900 text-white border border-gray-700 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {isLoading && <div className="text-gray-400">Loading contacts...</div>}

        {/* Contacts Table */}
        <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
          <table className="w-full">
            <thead className="bg-gray-800 border-b border-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Name</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Phone</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">WhatsApp</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Email</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-300">Messages</th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact: any, idx: number) => (
                <tr
                  key={contact.id}
                  className={`border-b border-gray-800 hover:bg-gray-800/50 transition-colors ${
                    idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-900/50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">
                      {contact.name || <span className="text-gray-500 italic">Unnamed</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {contact.phone ? (
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        {contact.phone}
                      </a>
                    ) : (
                      <span className="text-gray-600 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {contact.whatsapp ? (
                      <span className="text-sm text-gray-300">{contact.whatsapp}</span>
                    ) : (
                      <span className="text-gray-600 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {contact.email ? (
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        {contact.email}
                      </a>
                    ) : (
                      <span className="text-gray-600 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-400">
                      {contact._count?.messages || 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedContact(contact);
                          setModalOpen(true);
                        }}
                        className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm text-white transition-colors"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${contact.name || 'this contact'}?`)) {
                            deleteContact.mutate(contact.id);
                          }
                        }}
                        className="px-3 py-1 rounded bg-red-900 hover:bg-red-800 text-sm text-white transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredContacts.length === 0 && !isLoading && (
            <div className="text-center py-12 text-gray-400">
              {searchQuery ? 'No contacts match your search' : 'No contacts yet'}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">Total Contacts</div>
            <div className="text-2xl font-bold">{contacts?.contacts?.length || 0}</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">With Email</div>
            <div className="text-2xl font-bold">
              {contacts?.contacts?.filter((c: any) => c.email).length || 0}
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">With Phone</div>
            <div className="text-2xl font-bold">
              {contacts?.contacts?.filter((c: any) => c.phone).length || 0}
            </div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-sm text-gray-400 mb-1">With WhatsApp</div>
            <div className="text-2xl font-bold">
              {contacts?.contacts?.filter((c: any) => c.whatsapp).length || 0}
            </div>
          </div>
        </div>
      </div>

      {selectedContact && (
        <ContactProfileModal
          contact={selectedContact}
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedContact(null);
          }}
          onSaved={(updated) => {
            queryClient.invalidateQueries({ queryKey: ["all-contacts"] });
          }}
        />
      )}
    </div>
  );
}

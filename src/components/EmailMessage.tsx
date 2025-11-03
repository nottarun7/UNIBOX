"use client";

import { useState } from "react";

export default function EmailMessage({ message }: { message: any }) {
  const [expanded, setExpanded] = useState(false);

  // Extract subject from content (if it exists) or use default
  const subject = message.subject || "No Subject";
  const timestamp = new Date(message.timestamp).toLocaleString([], { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  });

  return (
    <div 
      className={`border-b border-gray-700 hover:bg-gray-800 transition-colors cursor-pointer ${
        expanded ? 'bg-gray-800' : ''
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Collapsed View - Gmail style */}
      {!expanded ? (
        <div className="px-4 py-3 flex items-center gap-4">
          {/* Direction indicator */}
          <div className="flex-shrink-0 w-6">
            {message.direction === 'inbound' ? (
              <span className="text-blue-400">📥</span>
            ) : (
              <span className="text-green-400">📤</span>
            )}
          </div>

          {/* From/To */}
          <div className="flex-shrink-0 w-32 truncate text-sm font-medium">
            {message.direction === 'inbound' 
              ? (message.contact?.name || message.contact?.email || 'Unknown')
              : 'You'
            }
          </div>

          {/* Subject */}
          <div className="flex-1 truncate text-sm">
            <span className="font-medium">{subject}</span>
            {!expanded && (
              <span className="text-gray-400 ml-2">
                — {message.content.substring(0, 100)}...
              </span>
            )}
          </div>

          {/* Timestamp */}
          <div className="flex-shrink-0 text-xs text-gray-400">
            {timestamp}
          </div>
        </div>
      ) : (
        /* Expanded View - Full email */
        <div className="px-4 py-4">
          {/* Header */}
          <div className="mb-4 pb-3 border-b border-gray-700">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-lg font-semibold">{subject}</h3>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(false);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">From:</span>
                <span>
                  {message.direction === 'inbound' 
                    ? (message.contact?.email || 'Unknown')
                    : (message.user?.email || 'You')
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">To:</span>
                <span>
                  {message.direction === 'inbound' 
                    ? (message.user?.email || 'You')
                    : (message.contact?.email || 'Unknown')
                  }
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Date:</span>
                <span>{new Date(message.timestamp).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="prose prose-invert max-w-none">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </div>
          </div>

          {/* Attachments */}
          {message.mediaUrls && message.mediaUrls.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-sm font-medium text-gray-400 mb-2">
                Attachments ({message.mediaUrls.length})
              </div>
              <div className="flex gap-2 flex-wrap">
                {message.mediaUrls.map((url: string, idx: number) => (
                  <a 
                    key={idx} 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="hover:opacity-80 transition-opacity"
                  >
                    <img 
                      src={url} 
                      alt={`attachment-${idx}`} 
                      className="max-w-xs max-h-48 rounded border border-gray-700"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default function Header() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header style={{ height: 'var(--header-height)' }} className="border-b border-gray-800 bg-[#0a0a0a]">
      <div className="max-w-full h-full flex items-center justify-between px-8">
        {/* Left: Brand with Logo */}
        <Link href="/inbox" className="flex items-center gap-2 text-lg font-bold text-white hover:text-indigo-400 transition-colors whitespace-nowrap">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M3 8L12 13L21 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="8" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="16" cy="12" r="1.5" fill="currentColor"/>
          </svg>
          Unibox
        </Link>

        {/* Right: Nav + Account */}
        <div className="hidden sm:flex items-center gap-8 ml-auto">
          <nav className="flex items-center gap-8">
            <Link href="/inbox" className="text-sm text-gray-300 hover:text-white transition-colors">Inbox</Link>
            <Link href="/contacts" className="text-sm text-gray-300 hover:text-white transition-colors">Contacts</Link>
            <Link href="/scheduled" className="text-sm text-gray-300 hover:text-white transition-colors">Scheduled</Link>
            <Link href="/dashboard" className="text-sm text-gray-300 hover:text-white transition-colors">Dashboard</Link>
          </nav>
          
          <div className="flex items-center gap-4 border-l border-gray-700 pl-8">
            {session?.user ? (
              <>
                <span className="text-sm text-gray-400 whitespace-nowrap">{session.user.name || session.user.email}</span>
                <button
                  onClick={() => signOut({ callbackUrl: "/signin" })}
                  className="text-sm px-4 py-1.5 rounded-md bg-gray-800 text-white hover:bg-gray-700 transition-colors whitespace-nowrap"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link href="/signin" className="text-sm text-gray-300 hover:text-white transition-colors">Sign in</Link>
            )}
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden p-2 rounded-md hover:bg-gray-800 transition-colors ml-auto"
          aria-label="Menu"
          onClick={() => setMobileOpen((s) => !s)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 mx-4 bg-[#0b0b0b] border border-gray-800 rounded-lg shadow-xl z-50 p-4">
            <div className="flex flex-col gap-3">
              <Link href="/inbox" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded text-sm hover:bg-gray-900 transition-colors">Inbox</Link>
              <Link href="/contacts" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded text-sm hover:bg-gray-900 transition-colors">Contacts</Link>
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded text-sm hover:bg-gray-900 transition-colors">Dashboard</Link>
              <div className="border-t border-gray-800 my-2"></div>
              {session?.user ? (
                <>
                  <div className="text-sm text-gray-400 px-3">{session.user.name || session.user.email}</div>
                  <button 
                    onClick={() => { signOut({ callbackUrl: "/signin" }); setMobileOpen(false); }} 
                    className="w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-900 transition-colors"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link href="/signin" onClick={() => setMobileOpen(false)} className="px-3 py-2 rounded text-sm hover:bg-gray-900 transition-colors">Sign in</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const pathname = usePathname();
  const { user, userProfile, logout } = useAuth();
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const isAuthority = userProfile?.role === "authority" || userProfile?.role === "admin";

  return (
    <header className="sticky top-0 z-50 w-full bg-surface/95 backdrop-blur-sm border-b border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.6" className="text-ink" />
            <path d="M8 12.5l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-ink" />
          </svg>
          <span className="font-bold text-[15px] tracking-tight text-ink">CivicFix</span>
        </Link>

        {/* Center links */}
        <nav className="hidden lg:flex items-center gap-6 text-[13.5px] font-medium text-muted">
          <Link href="/problems-around-you" className={pathname === "/problems-around-you" ? "text-citizen-ink font-semibold" : "hover:text-ink transition-colors"}>
            Problems around you
          </Link>
          <a href="#how-it-works" className="hover:text-ink transition-colors">How it works</a>
          <div className="relative">
            <button
              onClick={() => setResourcesOpen(!resourcesOpen)}
              className="flex items-center gap-1 hover:text-ink transition-colors"
            >
              Resources <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {resourcesOpen && (
              <div className="absolute top-full left-0 mt-2 w-52 bg-surface border border-line rounded-xl shadow-sm py-1.5 z-50">
                <Link href="/dashboard" className="block px-4 py-2 text-xs text-ink hover:bg-canvas">Citizen dashboard</Link>
                <Link href="/admin" className="block px-4 py-2 text-xs text-ink hover:bg-canvas">Authority console</Link>
              </div>
            )}
          </div>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-line text-xs font-semibold text-ink">
                <span className={`w-1.5 h-1.5 rounded-full ${isAuthority ? "bg-authority" : "bg-citizen"}`} />
                {userProfile?.name || user.email}
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-muted hover:text-ink border border-line transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login/citizen" className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-ink hover:bg-canvas transition-colors">
                Citizen login
              </Link>
              <Link href="/login/authority" className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-ink hover:bg-canvas transition-colors">
                Authority login
              </Link>
              <Link
                href="/report"
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-citizen hover:opacity-90 transition-opacity"
              >
                Report an issue
              </Link>
            </>
          )}
        </div>

      </div>
    </header>
  );
}

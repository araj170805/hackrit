"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, ChevronDown, Camera, User, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const pathname = usePathname();
  const { user, userProfile, logout } = useAuth();
  const [resourcesOpen, setResourcesOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-2xl tracking-tight text-slate-900 group">
          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform">
            <MapPin className="w-5 h-5 fill-white text-emerald-600" />
          </div>
          <span className="font-extrabold text-slate-900 tracking-tight flex items-center">
            Civic<span className="text-emerald-700">Fix</span>
          </span>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600">
          <Link href="/problems-around-you" className="hover:text-emerald-700 transition-colors font-semibold text-emerald-600 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            Problems Around You
          </Link>
          <a href="#how-it-works" className="hover:text-emerald-700 transition-colors">
            How It Works
          </a>
          <a href="#features" className="hover:text-emerald-700 transition-colors">
            Features
          </a>
          <a href="#citizens" className="hover:text-emerald-700 transition-colors">
            For Citizens
          </a>
          <a href="#authorities" className="hover:text-emerald-700 transition-colors">
            For Authorities
          </a>
          <div className="relative">
            <button
              onClick={() => setResourcesOpen(!resourcesOpen)}
              className="flex items-center gap-1 hover:text-emerald-700 transition-colors focus:outline-none"
            >
              Resources <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            {resourcesOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-100 rounded-xl shadow-lg py-2 z-50">
                <Link href="/dashboard" className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-emerald-700">
                  Citizen Dashboard
                </Link>
                <Link href="/admin" className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-emerald-700">
                  Authority Command Center
                </Link>
                <a href="#how-it-works" className="block px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-emerald-700">
                  AI Workflow Guide
                </a>
              </div>
            )}
          </div>
          <a href="#about" className="hover:text-emerald-700 transition-colors">
            About Us
          </a>
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3.5 py-1.5 rounded-full border border-slate-200">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-700">
                  {userProfile?.name || user.email}
                </span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <>
              <Link
                href="/login/citizen"
                className="px-5 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs"
              >
                Citizen Login
              </Link>
              <Link
                href="/login/authority"
                className="px-5 py-2 rounded-full border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs"
              >
                Authority Login
              </Link>
              <Link
                href="/report"
                className="px-5 py-2 rounded-full text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5 hover:scale-[1.02]"
              >
                <Camera className="w-3.5 h-3.5" />
                Report a Problem
              </Link>
            </>
          )}
        </div>

      </div>
    </header>
  );
}


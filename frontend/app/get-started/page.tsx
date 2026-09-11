"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function GetStartedPage() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-canvas flex flex-col items-center justify-center px-4 py-16">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors mb-8">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </Link>

      <div className="text-center mb-10 max-w-md">
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-ink">Who's signing in?</h1>
        <p className="text-muted text-[13.5px] mt-2">Your experience is tailored to your role.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
        <Link
          href="/login/citizen"
          className="group bg-surface border border-line rounded-2xl p-7 flex flex-col gap-4 hover:border-citizen transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-citizen-soft flex items-center justify-center text-citizen-ink">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 21c4-4.5 7-8.2 7-12a7 7 0 10-14 0c0 3.8 3 7.5 7 12z" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="12" cy="9" r="2.4" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-ink text-base mb-1">I'm a citizen</h2>
            <p className="text-[13px] text-muted leading-relaxed">Report issues, support what's nearby, and track your reports.</p>
          </div>
          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-citizen-ink mt-auto pt-1">
            Continue <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>

        <Link
          href="/login/authority"
          className="group bg-surface border border-line rounded-2xl p-7 flex flex-col gap-4 hover:border-authority transition-colors"
        >
          <div className="w-12 h-12 rounded-xl bg-authority-soft flex items-center justify-center text-authority-ink">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-ink text-base mb-1">I'm an authority</h2>
            <p className="text-[13px] text-muted leading-relaxed">Manage the priority queue, verify resolutions, and track areas.</p>
          </div>
          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-authority-ink mt-auto pt-1">
            Continue <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </div>

      <p className="text-[12.5px] text-muted mt-8">
        New here? Both options let you create an account.
      </p>
    </div>
  );
}

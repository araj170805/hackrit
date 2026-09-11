import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface py-10 text-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

          <div className="space-y-2.5 md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-sm text-ink">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M8 12.5l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              CivicFix
            </div>
            <p className="text-[13px] max-w-sm leading-relaxed">
              Report civic issues, track them to resolution, and confirm the fix actually worked &mdash; for citizens and authorities alike.
            </p>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-ink mb-3">Platform</h4>
            <ul className="space-y-2 text-[13px]">
              <li><Link href="/report" className="hover:text-ink transition-colors">Report a problem</Link></li>
              <li><Link href="/dashboard" className="hover:text-ink transition-colors">Citizen dashboard</Link></li>
              <li><Link href="/admin" className="hover:text-ink transition-colors">Authority console</Link></li>
            </ul>
          </div>

        </div>

        <div className="pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between text-[12px] gap-3">
          <p>&copy; {new Date().getFullYear()} CivicFix</p>
        </div>
      </div>
    </footer>
  );
}

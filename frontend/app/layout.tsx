import type { Metadata } from "next";
import { IBM_Plex_Sans, Newsreader } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CivicChatbot } from "@/components/CivicChatbot";
import { AuthProvider } from "@/context/AuthContext";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-serif", style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "CivicFix — Geo-aware Autonomous AI Civic Resolution Platform",
  description: "From civic complaint to civic action. Autonomous agentic AI workflow for issue classification, priority scoring, duplicate consolidation, and SLA escalation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plexSans.variable} ${newsreader.variable} h-full`}>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className={`${plexSans.className} min-h-full flex flex-col bg-canvas dark:bg-slate-950 text-ink dark:text-slate-100 antialiased selection:bg-citizen selection:text-white`}>
        <AuthProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <CivicChatbot />
        </AuthProvider>
      </body>
    </html>
  );
}


"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle, MapPin, Calendar, Clock, AlertTriangle, ArrowRight, ShieldCheck, Maximize2, Minimize2, User, Activity, Building } from "lucide-react";
import { useRouter } from "next/navigation";
import { getComplaints } from "@/lib/api";
import { StatusBadge, PriorityBadge } from "@/components/StatusBadge";
import { LeafletMap } from "@/components/LeafletMap";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { getCurrentLocation } from "@/lib/geolocation";

const DEFAULT_LOCATION: [number, number] = [22.2505, 84.9011];

function getDistanceKM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function CitizenDashboardPage() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading } = useAuth();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [allComplaints, setAllComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const isAuthority = userProfile?.role === "authority" || userProfile?.role === "admin";

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login/citizen");
      return;
    }
    // This is the citizen dashboard — an authority account belongs on the
    // authority console, not here, so it never sees citizen-only features.
    if (!authLoading && user && isAuthority) {
      router.push("/admin");
    }
  }, [user, authLoading, isAuthority, router]);

  const detectLocation = () => {
    setLocationDenied(false);
    getCurrentLocation()
      .then((loc) => setUserLocation([loc.latitude, loc.longitude]))
      .catch(() => {
        setLocationDenied(true);
        setUserLocation(DEFAULT_LOCATION);
      });
  };

  useEffect(() => { detectLocation(); }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = auth.currentUser;
        const data = await getComplaints(currentUser ? { userId: currentUser.uid } : {});
        setComplaints(data);

        // Fetch all complaints for the live city map
        const allData = await getComplaints({});
        setAllComplaints(allData);
      } catch (err) {
        console.error("Failed to load complaints:", err);
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      loadData();
    }
  }, [user]);

  if (authLoading || !user || isAuthority) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin"></div>
      </div>
    );
  }

  const filteredCityComplaints = allComplaints.filter(c => {
    if (!userLocation) return true;
    const lat = c.location?.latitude ?? DEFAULT_LOCATION[0];
    const lon = c.location?.longitude ?? DEFAULT_LOCATION[1];
    return getDistanceKM(userLocation[0], userLocation[1], lat, lon) <= 20;
  });

  const mapMarkers = filteredCityComplaints.map(c => ({
    id: c.complaintId,
    latitude: c.location?.latitude ?? DEFAULT_LOCATION[0],
    longitude: c.location?.longitude ?? DEFAULT_LOCATION[1],
    title: `${c.complaintId}: ${c.category?.replace(/_/g, " ")}`,
    category: c.category,
    priority: c.priority,
    status: c.status,
    impactRadius: c.impactRadius || (c.duplicateCount > 0 ? 3000 + (c.duplicateCount * 500) : 1500),
    isMine: complaints.some((my: any) => my.complaintId === c.complaintId),
    summary: c.summary,
    imageUrl: c.imageUrl
  }));

  const totalComplaints = complaints.length;
  const totalImpact = complaints.reduce((sum, c) => sum + (c.affectedCitizens || c.duplicateCount || 0), 0);
  
  const departmentCounts = complaints.reduce((acc, c) => {
    const dept = c.category?.replace(/_/g, " ") || "Other";
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12 bg-canvas min-h-screen">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-line">
        <div>
          <h1 className="text-4xl font-serif-title text-ink tracking-tight">
            My Dashboard
          </h1>
          <p className="text-sm text-muted mt-2 max-w-lg">
            Track and monitor the status of your reported civic issues in real-time.
          </p>
        </div>

        <Link
          href="/report"
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-ink hover:bg-ink/90 text-white font-medium shadow-xl shadow-ink/10 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Report New Problem
        </Link>
      </div>

      {/* My Profile / Impact Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-8 border border-line shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-full bg-citizen-soft text-citizen flex items-center justify-center border border-citizen/20">
            <User className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted">Total Reports</p>
            <h4 className="text-3xl font-serif-title text-ink mt-1">{loading ? "-" : totalComplaints}</h4>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-line shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="w-14 h-14 rounded-full bg-citizen-soft text-citizen flex items-center justify-center border border-citizen/20">
            <Activity className="w-6 h-6" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted">Community Support</p>
            <h4 className="text-3xl font-serif-title text-ink mt-1">
              {loading ? "-" : totalImpact} <span className="text-sm font-sans font-medium text-muted ml-1">upvotes</span>
            </h4>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-line shadow-sm flex flex-col justify-center hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-4">
            <Building className="w-4 h-4 text-muted" strokeWidth={1.5} />
            <p className="text-sm font-medium text-muted">Department Breakdown</p>
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="h-4 bg-line rounded animate-pulse w-24"></div>
            ) : Object.keys(departmentCounts).length === 0 ? (
              <p className="text-xs text-muted">No reports yet.</p>
            ) : (
              Object.entries(departmentCounts).slice(0, 3).map(([dept, count]) => (
                <div key={dept} className="flex items-center justify-between text-[13px]">
                  <span className="text-ink capitalize truncate max-w-[200px]">{dept}</span>
                  <span className="font-bold text-ink bg-canvas px-2 py-0.5 rounded-full border border-line">{count as React.ReactNode}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Live City Map Section */}
      <div className="bg-white rounded-3xl p-8 border border-line shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif-title text-2xl text-ink flex items-center gap-2">
              <MapPin className="w-6 h-6 text-citizen" />
              Live City Issue Map
            </h3>
            <p className="text-sm text-muted mt-2">See problems reported in your area. Larger circles indicate areas with many duplicate reports.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-citizen bg-citizen-soft px-4 py-2 rounded-full border border-citizen/10">
              {filteredCityComplaints.length} Active City Issues
            </span>
            <button
              onClick={() => setIsMapFullscreen(true)}
              className="p-2 bg-canvas hover:bg-line rounded-xl text-ink transition-colors"
              title="Open Full View Map"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        {locationDenied && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <span>Couldn't get your real location, showing a default area instead.</span>
            <button onClick={detectLocation} className="font-semibold underline shrink-0 hover:text-amber-900 transition-colors">Retry</button>
          </div>
        )}
        <div className="h-[450px] rounded-2xl overflow-hidden border border-line">
          <LeafletMap center={userLocation || DEFAULT_LOCATION} zoom={13} markers={mapMarkers} height="100%" userLocation={userLocation} />
        </div>
      </div>

      {isMapFullscreen && (
        <div className="fixed inset-0 z-[100] bg-canvas flex flex-col">
          <div className="flex items-center justify-between p-6 bg-white border-b border-line shadow-sm">
            <div className="flex items-center gap-4">
              <MapPin className="w-8 h-8 text-citizen" />
              <div>
                <h3 className="font-serif-title text-2xl text-ink">Live City Issue Map</h3>
                <p className="text-sm text-muted">{filteredCityComplaints.length} issues within 20km of your location</p>
              </div>
            </div>
            <button 
              onClick={() => setIsMapFullscreen(false)}
              className="p-3 bg-canvas hover:bg-line rounded-2xl text-ink transition-colors"
              title="Exit Full View"
            >
              <Minimize2 className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 w-full relative">
            <LeafletMap center={userLocation || DEFAULT_LOCATION} zoom={13} markers={mapMarkers} height="100%" userLocation={userLocation} />
          </div>
        </div>
      )}

      <div className="pt-8">
        <h2 className="text-3xl font-serif-title text-ink mb-8">My Personal Reports</h2>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 rounded-3xl bg-line animate-pulse" />
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-20 px-4 bg-white rounded-3xl border border-line shadow-sm space-y-6">
          <div className="w-20 h-20 rounded-full bg-canvas text-muted mx-auto flex items-center justify-center border border-line">
            <ShieldCheck className="w-10 h-10" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-2xl font-serif-title text-ink mb-2">No active civic reports found</h3>
            <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
              You haven't submitted any complaints yet. Report an issue to initiate automated AI resolution and SLA tracking.
            </p>
          </div>
          <Link
            href="/report"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-ink text-white text-sm font-medium shadow-xl shadow-ink/10 hover:bg-ink/90 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Submit Your First Report
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {complaints.map((c) => (
            <Link
              key={c.complaintId}
              href={`/complaint/${c.complaintId}`}
              className="bg-white rounded-3xl p-6 border border-line shadow-sm hover:shadow-xl hover:shadow-ink/5 transition-all flex flex-col justify-between space-y-5 group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-medium text-muted bg-canvas border border-line px-2.5 py-1 rounded-md">
                    {c.complaintId}
                  </span>
                  <StatusBadge status={c.status} />
                </div>

                <h3 className="font-serif-title text-xl text-ink capitalize group-hover:text-citizen transition-colors line-clamp-1">
                  {c.category?.replace(/_/g, " ")}
                </h3>

                <p className="text-sm text-muted line-clamp-2 leading-relaxed">
                  {c.description}
                </p>
              </div>

              <div className="pt-4 border-t border-line space-y-3 text-sm text-muted">
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="w-4 h-4 text-citizen shrink-0" />
                  <span className="truncate">{c.address || "Coordinates recorded"}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <PriorityBadge priority={c.priority} />
                  
                  {c.duplicateCount > 0 && (
                    <span className="text-[11px] font-semibold text-citizen">
                      👥 {c.affectedCitizens || c.duplicateCount + 1} citizens affected
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      </div>

    </div>
  );
}

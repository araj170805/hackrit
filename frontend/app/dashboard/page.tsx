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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            My Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track and monitor the status of your reported civic issues in real-time.
          </p>
        </div>

        <Link
          href="/report"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Report New Problem
        </Link>
      </div>

      {/* My Profile / Impact Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Reports</p>
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white">{loading ? "-" : totalComplaints}</h4>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Community Support</p>
            <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white">{loading ? "-" : totalImpact} <span className="text-sm font-semibold text-slate-400 ml-1">upvotes</span></h4>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-2">
            <Building className="w-4 h-4 text-slate-400" />
            <p className="text-sm font-medium text-slate-500">Department Breakdown</p>
          </div>
          <div className="space-y-1.5">
            {loading ? (
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-24"></div>
            ) : Object.keys(departmentCounts).length === 0 ? (
              <p className="text-xs text-slate-400">No reports yet.</p>
            ) : (
              Object.entries(departmentCounts).slice(0, 3).map(([dept, count]) => (
                <div key={dept} className="flex items-center justify-between text-[13px]">
                  <span className="text-slate-600 dark:text-slate-300 capitalize truncate max-w-[200px]">{dept}</span>
                  <span className="font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{count as React.ReactNode}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Live City Map Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" />
              Live City Issue Map
            </h3>
            <p className="text-xs text-slate-500 mt-1">See problems reported in your area. Larger circles indicate areas with many duplicate reports.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900">
              {filteredCityComplaints.length} Active City Issues
            </span>
            <button
              onClick={() => setIsMapFullscreen(true)}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
              title="Open Full View Map"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {locationDenied && (
          <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
            <span>Couldn't get your real location, showing a default area instead.</span>
            <button onClick={detectLocation} className="font-semibold underline shrink-0">Retry</button>
          </div>
        )}
        <div className="h-[400px]">
          <LeafletMap center={userLocation || DEFAULT_LOCATION} zoom={13} markers={mapMarkers} height="100%" userLocation={userLocation} />
        </div>
      </div>

      {isMapFullscreen && (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col">
          <div className="flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 shadow-lg">
            <div className="flex items-center gap-3">
              <MapPin className="w-6 h-6 text-emerald-500" />
              <div>
                <h3 className="font-bold text-white text-lg">Live City Issue Map</h3>
                <p className="text-xs text-slate-400">{filteredCityComplaints.length} issues within 20km of your location</p>
              </div>
            </div>
            <button 
              onClick={() => setIsMapFullscreen(false)}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-white transition-colors"
              title="Exit Full View"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 w-full relative">
            <LeafletMap center={userLocation || DEFAULT_LOCATION} zoom={13} markers={mapMarkers} height="100%" userLocation={userLocation} />
          </div>
        </div>
      )}

      <div className="pt-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">My Personal Reports</h2>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-slate-200 dark:bg-slate-800/50 animate-pulse" />
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 mx-auto flex items-center justify-center">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No active civic reports found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            You haven't submitted any complaints yet. Report an issue to initiate automated AI resolution and SLA tracking.
          </p>
          <Link
            href="/report"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow-md"
          >
            <PlusCircle className="w-4 h-4" />
            Submit Your First Report
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {complaints.map((c) => (
            <Link
              key={c.complaintId}
              href={`/complaint/${c.complaintId}`}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:border-blue-300 dark:hover:border-blue-800 flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {c.complaintId}
                  </span>
                  <StatusBadge status={c.status} />
                </div>

                <h3 className="font-bold text-base text-slate-900 dark:text-white capitalize group-hover:text-blue-600 transition-colors">
                  {c.category?.replace("_", " ")}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {c.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="truncate">{c.address || "Coordinates recorded"}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <PriorityBadge priority={c.priority} />
                  
                  {c.duplicateCount > 0 && (
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
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

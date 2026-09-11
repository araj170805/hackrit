"use client";

import dynamic from "next/dynamic";
import React from "react";

const LeafletMapInner = dynamic(() => import("./LeafletMapInner"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center text-slate-400 text-sm animate-pulse border border-slate-200 dark:border-slate-800"
      style={{ height: "400px" }}
    >
      Loading OpenStreetMap GIS engine...
    </div>
  )
});

interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  category?: string;
  priority?: string;
  status?: string;
  impactRadius?: number;
}

interface LeafletMapProps {
  center: [number, number];
  zoom?: number;
  markers?: MarkerData[];
  selectedLocation?: [number, number] | null;
  onLocationSelect?: (lat: number, lng: number) => void;
  impactRadiusMeters?: number;
  height?: string;
  userLocation?: [number, number] | null;
}

export function LeafletMap(props: LeafletMapProps) {
  return <LeafletMapInner {...props} />;
}

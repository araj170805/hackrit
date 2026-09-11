"use client";

import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";

interface MarkerData {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  category?: string;
  priority?: string;
  status?: string;
  impactRadius?: number;
  isMine?: boolean;
  summary?: string;
  imageUrl?: string;
}

interface LeafletMapInnerProps {
  center: [number, number];
  zoom?: number;
  markers?: MarkerData[];
  selectedLocation?: [number, number] | null;
  onLocationSelect?: (lat: number, lng: number) => void;
  impactRadiusMeters?: number;
  height?: string;
}

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const criticalIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

const highIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

const mediumIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

const mineIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34]
});

const userIcon = L.divIcon({
  className: "bg-transparent",
  html: `<div class="relative flex items-center justify-center w-6 h-6">
           <div class="absolute w-full h-full bg-blue-500 rounded-full animate-ping opacity-75"></div>
           <div class="relative w-3 h-3 bg-blue-600 border-2 border-white rounded-full shadow-md"></div>
         </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

function LocationPicker({ onSelect }: { onSelect?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onSelect) {
        onSelect(e.latlng.lat, e.latlng.lng);
      }
    }
  });
  return null;
}

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function LeafletMapInner({
  center,
  zoom = 14,
  markers = [],
  selectedLocation,
  onLocationSelect,
  impactRadiusMeters,
  height = "400px",
  userLocation
}: LeafletMapInnerProps & { userLocation?: [number, number] | null }) {
  const getMarkerIcon = (priority?: string, isMine?: boolean) => {
    if (isMine) return mineIcon;
    const p = (priority || "").toUpperCase();
    if (p === "CRITICAL") return criticalIcon;
    if (p === "HIGH") return highIcon;
    if (p === "MEDIUM") return mediumIcon;
    return defaultIcon;
  };

  return (
    <div 
      className="relative w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md flex-1"
      style={{ height }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%", zIndex: 10 }}
        scrollWheelZoom={false}
      >
        <MapUpdater center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>
              <div className="text-xs font-bold text-blue-700">📍 You are here</div>
            </Popup>
          </Marker>
        )}

        {onLocationSelect && <LocationPicker onSelect={onLocationSelect} />}

        {selectedLocation && (
          <Marker position={selectedLocation} icon={defaultIcon}>
            <Popup>
              <div className="text-xs font-semibold text-slate-800">
                📍 Captured GPS Location
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {selectedLocation[0].toFixed(4)}, {selectedLocation[1].toFixed(4)}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {impactRadiusMeters && selectedLocation && (
          <Circle
            center={selectedLocation}
            radius={impactRadiusMeters}
            pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.15, weight: 2 }}
          />
        )}

        {markers.map((m) => (
          <React.Fragment key={m.id}>
            <Marker position={[m.latitude, m.longitude]} icon={getMarkerIcon(m.priority, m.isMine)}>
              <Popup>
                <div className="p-1 space-y-2 min-w-[180px] max-w-[220px]">
                  {m.imageUrl && (
                    <img src={m.imageUrl} alt="Problem thumbnail" className="w-full h-28 object-cover rounded-md shadow-sm" />
                  )}
                  {m.isMine && (
                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-violet-600 bg-violet-50 p-1 rounded text-center border border-violet-100">
                      ★ You reported from here
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-xs text-slate-900 leading-tight line-clamp-2">{m.title}</div>
                    {m.summary && <div className="text-[10px] text-slate-600 italic mt-1 leading-snug line-clamp-3">{m.summary}</div>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-500 capitalize font-medium">{m.category?.replace(/_/g, " ")}</span>
                    {m.priority && (
                      <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {m.priority}
                      </span>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>

            {m.impactRadius && (
              <Circle
                center={[m.latitude, m.longitude]}
                radius={m.impactRadius}
                pathOptions={{
                  color: m.isMine ? "#7c3aed" : m.priority === "CRITICAL" ? "#ef4444" : m.priority === "HIGH" ? "#f97316" : "#3b82f6",
                  fillColor: m.isMine ? "#7c3aed" : m.priority === "CRITICAL" ? "#ef4444" : m.priority === "HIGH" ? "#f97316" : "#3b82f6",
                  fillOpacity: 0.25,
                  weight: 2
                }}
              />
            )}
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
}

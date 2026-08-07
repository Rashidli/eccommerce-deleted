"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type { Branch } from "@/lib/couriers";

// Leaflet-in default marker şəkilləri bundler ilə sınır —
// ona görə markerləri inline SVG divIcon kimi qururuq.
function pin(selected: boolean) {
  const fill = selected ? "var(--brand)" : "var(--brand-ink)";
  return L.divIcon({
    className: "",
    html: `<svg viewBox="0 0 24 24" width="32" height="32" fill="${fill}" stroke="white" stroke-width="1.5">
      <path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z"/>
      <circle cx="12" cy="10" r="2.6" fill="white" stroke="none"/>
    </svg>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30],
  });
}

// Kargo dəyişəndə xəritəni yeni filialların üzərinə gətirir.
function FitBranches({ branches }: { branches: Branch[] }) {
  const map = useMap();

  useEffect(() => {
    if (branches.length === 0) return;
    const bounds = L.latLngBounds(branches.map((b) => [b.lat, b.lng]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
  }, [branches, map]);

  return null;
}

export default function BranchMap({
  branches,
  selectedId,
  onSelect,
}: {
  branches: Branch[];
  selectedId: string | null;
  onSelect: (branch: Branch) => void;
}) {
  return (
    <MapContainer
      center={[40.3897, 49.8486]}
      zoom={12}
      scrollWheelZoom={false}
      className="h-[380px] w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBranches branches={branches} />

      {branches.map((branch) => (
        <Marker
          key={branch.id}
          position={[branch.lat, branch.lng]}
          icon={pin(branch.id === selectedId)}
          eventHandlers={{ click: () => onSelect(branch) }}
        >
          <Popup>
            <p className="font-semibold">{branch.name}</p>
            <p className="text-xs">{branch.address}</p>
            <p className="text-xs">{branch.hours}</p>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

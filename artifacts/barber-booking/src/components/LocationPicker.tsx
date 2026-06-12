import { useEffect, useRef, useState } from "react";
import { Navigation, X, Check } from "lucide-react";

declare global {
  interface Window { L: any; }
}

interface Props {
  onSelect: (lat: number, lng: number) => void;
  onClose: () => void;
  initialLat?: number;
  initialLng?: number;
}

function makeIcon(L: any) {
  return L.divIcon({
    html: '<div style="width:22px;height:22px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(37,99,235,0.5)"></div>',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    className: "",
  });
}

function makeGpsIcon(L: any) {
  return L.divIcon({
    html: `<div style="position:relative;width:28px;height:28px">
      <div style="position:absolute;inset:0;background:rgba(37,99,235,0.25);border-radius:50%;animation:gpsPulse 1.8s ease-out infinite"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:14px;height:14px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    className: "",
  });
}

export default function LocationPicker({ onSelect, onClose, initialLat, initialLng }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [selLat, setSelLat] = useState<number | null>(initialLat ?? null);
  const [selLng, setSelLng] = useState<number | null>(initialLng ?? null);
  const [loading, setLoading] = useState(true);
  const [locErr, setLocErr] = useState("");

  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const init = () => {
      if (!containerRef.current || mapRef.current) return;
      setLoading(false);
      const L = window.L;
      const lat = initialLat ?? 20.5937;
      const lng = initialLng ?? 78.9629;
      const zoom = initialLat ? 14 : 5;
      const map = L.map(containerRef.current).setView([lat, lng], zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 18,
      }).addTo(map);
      mapRef.current = map;
      if (initialLat && initialLng) {
        markerRef.current = L.marker([initialLat, initialLng], { icon: makeIcon(L) }).addTo(map);
      }
      map.on("click", (e: any) => {
        const { lat: la, lng: lo } = e.latlng;
        setSelLat(la);
        setSelLng(lo);
        if (markerRef.current) {
          markerRef.current.setLatLng([la, lo]);
        } else {
          markerRef.current = L.marker([la, lo], { icon: makeIcon(L) }).addTo(map);
        }
      });
    };

    if (window.L) {
      init();
    } else {
      const s = document.createElement("script");
      s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      s.onload = init;
      document.head.appendChild(s);
    }

    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []);

  const useMyLocation = () => {
    setLocErr("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const la = pos.coords.latitude;
        const lo = pos.coords.longitude;
        setSelLat(la); setSelLng(lo);
        if (mapRef.current) {
          mapRef.current.setView([la, lo], 15);
          if (markerRef.current) {
            markerRef.current.setLatLng([la, lo]);
            markerRef.current.setIcon(makeGpsIcon(window.L));
          } else {
            markerRef.current = window.L.marker([la, lo], { icon: makeGpsIcon(window.L) }).addTo(mapRef.current);
          }
        }
      },
      () => setLocErr("Couldn't get location. Allow location access and try again.")
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl overflow-hidden flex flex-col" style={{ height: "88vh", maxHeight: 580 }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 flex-shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Pick Shop Location</h3>
            <p className="text-xs text-slate-500">Tap on the map to drop a pin</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 flex-shrink-0 flex-wrap">
          <button
            type="button"
            onClick={useMyLocation}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Navigation className="w-3.5 h-3.5" /> Use My Location
          </button>
          {selLat && selLng && (
            <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-lg font-mono">
              {selLat.toFixed(4)}, {selLng.toFixed(4)}
            </span>
          )}
          {locErr && <span className="text-xs text-red-600">{locErr}</span>}
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center bg-slate-100">
            <p className="text-slate-500 text-sm animate-pulse">Loading map…</p>
          </div>
        )}
        <div ref={containerRef} className="flex-1" style={{ display: loading ? "none" : "block" }} />

        <div className="px-4 py-3 border-t border-slate-200 flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 border border-slate-300 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selLat || !selLng}
            onClick={() => { if (selLat && selLng) { onSelect(selLat, selLng); onClose(); } }}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" /> Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

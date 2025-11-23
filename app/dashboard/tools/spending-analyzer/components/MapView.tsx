"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import type { Transaction } from "./TransactionTable";

interface MapViewProps {
  transactions: Transaction[];
  onLocationClick?: (transactions: Transaction[]) => void;
}

export default function MapView({ transactions, onLocationClick }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Calculate center of all transactions
    const avgLat = transactions.reduce((sum, t) => sum + (t.latitude || 0), 0) / transactions.length;
    const avgLng = transactions.reduce((sum, t) => sum + (t.longitude || 0), 0) / transactions.length;

    // Initialize map
    const map = L.map(mapRef.current, {
      center: [avgLat, avgLng],
      zoom: 5,
      scrollWheelZoom: true,
    });

    mapInstanceRef.current = map;

    // Add monotone tile layer (grayscale)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || transactions.length === 0) return;

    // Remove existing heat layer
    if (heatLayerRef.current) {
      mapInstanceRef.current.removeLayer(heatLayerRef.current);
    }

    // Prepare heatmap data: [lat, lng, intensity]
    const heatData = transactions.map(t => {
      const intensity = Math.abs(t.amount) / 100; // Normalize intensity
      return [t.latitude!, t.longitude!, Math.min(intensity, 1)] as [number, number, number];
    });

    // Create heat layer
    // @ts-ignore - leaflet.heat types may not be perfect
    const heatLayer = L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 10,
      max: 1.0,
      gradient: {
        0.0: "#3b82f6",  // blue
        0.3: "#8b5cf6",  // purple
        0.5: "#ec4899",  // pink
        0.7: "#f59e0b",  // amber
        1.0: "#ef4444",  // red
      },
    });

    heatLayer.addTo(mapInstanceRef.current);
    heatLayerRef.current = heatLayer;

    // Add markers for major spending locations
    const locationGroups = transactions.reduce((acc, t) => {
      const key = `${t.latitude},${t.longitude}`;
      if (!acc[key]) {
        acc[key] = {
          latitude: t.latitude!,
          longitude: t.longitude!,
          location: t.location || "Unknown",
          businessName: t.businessName,
          total: 0,
          count: 0,
        };
      }
      acc[key].total += Math.abs(t.amount);
      acc[key].count++;
      return acc;
    }, {} as Record<string, { latitude: number; longitude: number; location: string; businessName?: string; total: number; count: number }>);

    // Add markers for all locations
    Object.values(locationGroups).forEach(loc => {
        const marker = L.circleMarker([loc.latitude, loc.longitude], {
          radius: 8,
          fillColor: "#3b82f6",
          color: "#ffffff",
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8,
        });

        const popupContent = `
          <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 200px;">
            <strong style="font-size: 14px;">${loc.location}</strong><br/>
            <span style="font-size: 12px; color: #666;">
              ${loc.count} transaction${loc.count !== 1 ? "s" : ""}<br/>
              Total: $${loc.total.toFixed(2)}
            </span>
            <button
              id="view-transactions-${loc.latitude}-${loc.longitude}"
              style="
                margin-top: 8px;
                padding: 6px 12px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                width: 100%;
              "
              onmouseover="this.style.background='#2563eb'"
              onmouseout="this.style.background='#3b82f6'"
            >
              View Transactions
            </button>
          </div>
        `;

        marker.bindPopup(popupContent);

        // Add click handler for the button
        marker.on('popupopen', () => {
          const button = document.getElementById(`view-transactions-${loc.latitude}-${loc.longitude}`);
          if (button && onLocationClick) {
            button.onclick = () => {
              const locationTransactions = transactions.filter(
                t => t.latitude === loc.latitude && t.longitude === loc.longitude
              );
              onLocationClick(locationTransactions);
            };
          }
        });

        marker.addTo(mapInstanceRef.current!);
      });

    // Fit map to bounds of all transactions
    if (transactions.length > 0) {
      const bounds = L.latLngBounds(
        transactions.map(t => [t.latitude!, t.longitude!] as [number, number])
      );
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [transactions]);

  return (
    <div
      ref={mapRef}
      className="h-[600px] w-full rounded-lg overflow-hidden border border-border"
      style={{ backgroundColor: "#f5f5f5" }}
    />
  );
}

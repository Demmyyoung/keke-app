import { useEffect, useRef, useState } from 'react';
import { Location } from '../../types';

interface KekeMarker {
  id: string;
  location: Location;
  occupiedSeats: number;
  totalSeats: number;
  driverName: string;
  destination: string;
}

interface KekeMapProps {
  currentLocation: Location;
  kekes: KekeMarker[];
  onKekeSelect?: (kekes: KekeMarker) => void;
  selectedKekeId?: string;
  zoom?: number;
}

declare global {
  interface Window {
    google: any;
  }
}

export function KekeMap({
  currentLocation,
  kekes,
  onKekeSelect,
  selectedKekeId,
  zoom = 15,
}: KekeMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const userMarker = useRef<any>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    const loadGoogleMaps = async () => {
      if (window.google?.maps) {
        initMap();
        return;
      }

      const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (!googleMapsApiKey) {
        console.warn('Google Maps API key not configured');
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  const initMap = () => {
    if (!mapContainer.current || !window.google?.maps) return;

    map.current = new window.google.maps.Map(mapContainer.current, {
      center: {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
      },
      zoom,
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
    });

    addUserMarker();
    addKekeMarkers();
  };

  const addUserMarker = () => {
    if (!window.google?.maps || !map.current) return;

    if (userMarker.current) {
      userMarker.current.setMap(null);
    }

    userMarker.current = new window.google.maps.Marker({
      position: {
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
      },
      map: map.current,
      title: 'Your Location',
      icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png',
    });
  };

  const getSeatCapacityColor = (occupied: number, total: number) => {
    const percentage = (occupied / total) * 100;
    if (percentage <= 40) return 'green';
    if (percentage <= 70) return 'yellow';
    return 'red';
  };

  const addKekeMarkers = () => {
    if (!window.google?.maps || !map.current) return;

    markers.current.forEach((marker) => marker.setMap(null));
    markers.current = [];

    kekes.forEach((keke) => {
      const color = getSeatCapacityColor(keke.occupiedSeats, keke.totalSeats);
      const colorMap: Record<string, string> = {
        green: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        yellow: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
        red: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
      };

      const marker = new window.google.maps.Marker({
        position: {
          lat: keke.location.latitude,
          lng: keke.location.longitude,
        },
        map: map.current,
        title: `${keke.driverName} → ${keke.destination}`,
        icon: colorMap[color],
        animation: selectedKekeId === keke.id ? window.google.maps.Animation.BOUNCE : undefined,
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; font-size: 12px;">
            <strong>${keke.driverName}</strong><br/>
            Route: ${keke.destination}<br/>
            Seats: ${keke.occupiedSeats}/${keke.totalSeats}<br/>
            <button onclick="window.hailKeke && window.hailKeke('${keke.id}')" style="margin-top: 8px; padding: 4px 8px; background: #16a34a; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Hail Keke
            </button>
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(map.current, marker);
        if (onKekeSelect) {
          onKekeSelect(keke);
        }
      });

      markers.current.push(marker);
    });
  };

  useEffect(() => {
    if (map.current && window.google?.maps) {
      addUserMarker();
      addKekeMarkers();
    }
  }, [currentLocation, kekes, selectedKekeId]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full bg-gray-200 rounded-lg"
      style={{ minHeight: '400px' }}
    />
  );
}

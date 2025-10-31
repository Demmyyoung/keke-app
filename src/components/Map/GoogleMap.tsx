import { useEffect, useRef } from 'react';
import { Location } from '../../types';

interface GoogleMapProps {
  pickupLocation: Location;
  dropoffLocation?: Location;
  driverLocation?: Location;
  onMapReady?: () => void;
  zoom?: number;
  className?: string;
}

declare global {
  interface Window {
    google: any;
  }
}

export function GoogleMap({
  pickupLocation,
  dropoffLocation,
  driverLocation,
  onMapReady,
  zoom = 15,
  className = '',
}: GoogleMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markers = useRef<any[]>([]);
  const polyline = useRef<any>(null);

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
      script.onerror = () => {
        console.error('Failed to load Google Maps API');
      };
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    };

    loadGoogleMaps();
  }, []);

  const initMap = () => {
    if (!mapContainer.current || !window.google?.maps) return;

    map.current = new window.google.maps.Map(mapContainer.current, {
      center: {
        lat: pickupLocation.latitude,
        lng: pickupLocation.longitude,
      },
      zoom,
      disableDefaultUI: false,
      zoomControl: true,
      streetViewControl: false,
    });

    addMarkers();
    drawRoute();
    onMapReady?.();
  };

  const addMarkers = () => {
    markers.current.forEach((marker) => marker.setMap(null));
    markers.current = [];

    if (!window.google?.maps || !map.current) return;

    const pickupMarker = new window.google.maps.Marker({
      position: {
        lat: pickupLocation.latitude,
        lng: pickupLocation.longitude,
      },
      map: map.current,
      title: 'Pickup Location',
      icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
    });
    markers.current.push(pickupMarker);

    if (dropoffLocation) {
      const dropoffMarker = new window.google.maps.Marker({
        position: {
          lat: dropoffLocation.latitude,
          lng: dropoffLocation.longitude,
        },
        map: map.current,
        title: 'Dropoff Location',
        icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
      });
      markers.current.push(dropoffMarker);
    }

    if (driverLocation) {
      const driverMarker = new window.google.maps.Marker({
        position: {
          lat: driverLocation.latitude,
          lng: driverLocation.longitude,
        },
        map: map.current,
        title: 'Driver Location',
        icon: 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
      });
      markers.current.push(driverMarker);
    }
  };

  const drawRoute = () => {
    if (!window.google?.maps || !map.current) return;

    if (polyline.current) {
      polyline.current.setMap(null);
    }

    if (!dropoffLocation) return;

    const path = [
      {
        lat: pickupLocation.latitude,
        lng: pickupLocation.longitude,
      },
      {
        lat: dropoffLocation.latitude,
        lng: dropoffLocation.longitude,
      },
    ];

    polyline.current = new window.google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#4F46E5',
      strokeOpacity: 0.7,
      strokeWeight: 4,
      map: map.current,
    });

    const bounds = new window.google.maps.LatLngBounds();
    path.forEach((point) => bounds.extend(point));
    if (driverLocation) {
      bounds.extend({
        lat: driverLocation.latitude,
        lng: driverLocation.longitude,
      });
    }
    map.current.fitBounds(bounds, 100);
  };

  useEffect(() => {
    if (map.current && window.google?.maps) {
      addMarkers();
      drawRoute();
    }
  }, [pickupLocation, dropoffLocation, driverLocation]);

  return (
    <div
      ref={mapContainer}
      className={`w-full h-full bg-gray-200 rounded-lg ${className}`}
      style={{ minHeight: '300px' }}
    />
  );
}

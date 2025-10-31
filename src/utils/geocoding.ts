import { Location } from '../types';

const GEOCODING_API = 'https://nominatim.openstreetmap.org/search';
const REVERSE_GEOCODING_API = 'https://nominatim.openstreetmap.org/reverse';

interface GeocodingResult {
  lat: string;
  lon: string;
  display_name: string;
}

export async function geocodeAddress(address: string): Promise<Location | null> {
  try {
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      limit: '1',
    });

    const response = await fetch(`${GEOCODING_API}?${params}`, {
      headers: {
        'User-Agent': 'Keke-Ride-Service/1.0',
      },
    });

    if (!response.ok) throw new Error('Geocoding failed');

    const data: GeocodingResult[] = await response.json();

    if (data.length === 0) return null;

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
      format: 'json',
    });

    const response = await fetch(`${REVERSE_GEOCODING_API}?${params}`, {
      headers: {
        'User-Agent': 'Keke-Ride-Service/1.0',
      },
    });

    if (!response.ok) throw new Error('Reverse geocoding failed');

    const data: GeocodingResult = await response.json();

    return data.display_name;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

export function getGoogleMapsURL(latitude: number, longitude: number, label?: string): string {
  const baseUrl = 'https://www.google.com/maps/search/';
  const query = label ? `${label}` : `${latitude},${longitude}`;
  return `${baseUrl}${encodeURIComponent(query)}/@${latitude},${longitude},15z`;
}

export function getAppleMapsURL(latitude: number, longitude: number, label?: string): string {
  const query = label || 'Location';
  return `maps://maps.apple.com/?daddr=${latitude},${longitude}&q=${encodeURIComponent(query)}`;
}

export function getDirectionsURL(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): string {
  return `https://www.google.com/maps/dir/${fromLat},${fromLng}/${toLat},${toLng}`;
}

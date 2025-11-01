import { useState, useEffect } from 'react';
import { MapPin, Users, AlertCircle, Navigation2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentLocation } from '../../utils/location';
import { KekeMap } from './KekeMap';
import { Location } from '../../types';

interface KekeFleet {
  id: string;
  driver_id: string;
  current_latitude: number;
  current_longitude: number;
  destination_latitude: number;
  destination_longitude: number;
  destination_address: string;
  total_seats: number;
  occupied_seats: number;
  is_active: boolean;
}

interface KekeMarker {
  id: string;
  location: Location;
  occupiedSeats: number;
  totalSeats: number;
  driverName: string;
  destination: string;
}

export function KekeDiscovery() {
  const { profile } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [kekes, setKekes] = useState<KekeMarker[]>([]);
  const [selectedKeke, setSelectedKeke] = useState<KekeMarker | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCurrentLocation();
  }, []);

  useEffect(() => {
    if (currentLocation && profile?.is_verified) {
      loadNearbyKekes();

      const subscription = supabase
        .channel('keke_fleets_nearby')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'keke_fleets' },
          () => {
            loadNearbyKekes();
          }
        )
        .subscribe();

      const locationInterval = setInterval(loadNearbyKekes, 5000);

      return () => {
        subscription.unsubscribe();
        clearInterval(locationInterval);
      };
    }
  }, [currentLocation, profile?.is_verified]);

  const loadCurrentLocation = async () => {
    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);
    } catch (err) {
      setError('Unable to get your location. Please enable location services.');
      setLoading(false);
    }
  };

  const loadNearbyKekes = async () => {
    if (!currentLocation) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('keke_fleets')
        .select('*, driver_profiles:driver_id(profile:profiles(full_name))')
        .eq('is_active', true)
        .lt('occupied_seats', supabase.rpc('total_seats'));

      if (fetchError) throw fetchError;

      const formattedKekes: KekeMarker[] = (data || []).map((keke: any) => ({
        id: keke.id,
        location: {
          latitude: keke.current_latitude,
          longitude: keke.current_longitude,
        },
        occupiedSeats: keke.occupied_seats,
        totalSeats: keke.total_seats,
        driverName: keke.driver_profiles?.profile?.full_name || 'Driver',
        destination: keke.destination_address,
      }));

      setKekes(formattedKekes);
      setLoading(false);
    } catch (err) {
      console.error('Error loading kekes:', err);
      setError('Failed to load nearby Kekes');
      setLoading(false);
    }
  };

  const handleHail = async () => {
    if (!selectedKeke || !currentLocation) {
      setError('Please select a Keke');
      return;
    }

    if (!dropoffAddress) {
      setError('Please enter your dropoff address');
      return;
    }

    try {
      const fare = 100;

      const { error: hailError } = await supabase.from('passenger_hails').insert({
        passenger_id: profile!.id,
        keke_fleet_id: selectedKeke.id,
        pickup_latitude: currentLocation.latitude,
        pickup_longitude: currentLocation.longitude,
        pickup_address: 'Current Location',
        dropoff_latitude: currentLocation.latitude + 0.01,
        dropoff_longitude: currentLocation.longitude + 0.01,
        dropoff_address: dropoffAddress,
        fare,
        service_fee: 10,
      });

      if (hailError) throw hailError;

      setError('');
      setSelectedKeke(null);
      setDropoffAddress('');
      alert('Keke hailed successfully! Waiting for driver to accept.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to hail Keke');
    }
  };

  const getSeatColor = (occupied: number, total: number) => {
    const percentage = (occupied / total) * 100;
    if (percentage <= 40) return 'bg-green-100 text-green-700 border-green-300';
    if (percentage <= 70) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-red-100 text-red-700 border-red-300';
  };

  if (!profile?.is_verified) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
        <p className="text-yellow-700">
          Your account is pending verification. Please wait for admin approval to hail Kekes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {currentLocation ? (
            <KekeMap
              currentLocation={currentLocation}
              kekes={kekes}
              onKekeSelect={setSelectedKeke}
              selectedKekeId={selectedKeke?.id}
            />
          ) : (
            <div className="bg-gray-100 rounded-lg h-96 flex items-center justify-center">
              <p className="text-gray-600">Loading map...</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Available Kekes</h3>

          {loading ? (
            <p className="text-center py-8 text-gray-600">Searching for nearby Kekes...</p>
          ) : kekes.length === 0 ? (
            <p className="text-center py-8 text-gray-600">No Kekes available nearby</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {kekes.map((keke) => (
                <button
                  key={keke.id}
                  onClick={() => setSelectedKeke(keke)}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    selectedKeke?.id === keke.id
                      ? 'ring-2 ring-green-500 bg-green-50'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <p className="font-semibold text-gray-900">{keke.driverName}</p>
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{keke.destination}</span>
                  </div>
                  <div
                    className={`mt-2 px-2 py-1 rounded text-xs font-medium border ${getSeatColor(
                      keke.occupiedSeats,
                      keke.totalSeats
                    )}`}
                  >
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {keke.occupiedSeats}/{keke.totalSeats} seats
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {selectedKeke && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-900">Selected Keke</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Navigation2 className="w-4 h-4 inline mr-1" />
                  Where are you going?
                </label>
                <input
                  type="text"
                  value={dropoffAddress}
                  onChange={(e) => setDropoffAddress(e.target.value)}
                  placeholder="Enter destination"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <button
                onClick={handleHail}
                disabled={!dropoffAddress}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                Hail Keke - ₦110
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

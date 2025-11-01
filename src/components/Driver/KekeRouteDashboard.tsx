import { useState, useEffect } from 'react';
import { MapPin, Users, Navigation2, Power, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentLocation, watchLocation, clearLocationWatch } from '../../utils/location';
import { geocodeAddress } from '../../utils/geocoding';
import { DriverProfile, Location } from '../../types';

interface Route {
  id: string;
  originAddress: string;
  destinationAddress: string;
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}

interface PassengerHail {
  id: string;
  passengerName: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
}

export function KekeRouteDashboard() {
  const { profile } = useAuth();
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [isOnRoute, setIsOnRoute] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [hails, setHails] = useState<PassengerHail[]>([]);
  const [occupiedSeats, setOccupiedSeats] = useState(0);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
  const [destAddress, setDestAddress] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      loadDriverProfile();
    }
  }, [profile]);

  useEffect(() => {
    if (isOnRoute && driverProfile) {
      startLocationTracking();
      loadActiveHails();
    }

    return () => {
      if (locationWatchId !== null) {
        clearLocationWatch(locationWatchId);
      }
    };
  }, [isOnRoute, driverProfile]);

  const loadDriverProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('user_id', profile!.id)
        .maybeSingle();

      if (error) throw error;
      setDriverProfile(data);
    } catch (err) {
      console.error('Error loading driver profile:', err);
    }
  };

  const startLocationTracking = async () => {
    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);

      const watchId = watchLocation((location) => {
        setCurrentLocation(location);
        updateKekeLocation(location);
      });

      setLocationWatchId(watchId);
    } catch (err) {
      console.error('Error getting location:', err);
    }
  };

  const updateKekeLocation = async (location: Location) => {
    if (!driverProfile || !selectedRoute) return;

    try {
      const { error } = await supabase
        .from('keke_fleets')
        .update({
          current_latitude: location.latitude,
          current_longitude: location.longitude,
          destination_latitude: selectedRoute.destLat,
          destination_longitude: selectedRoute.destLng,
          last_location_update: new Date().toISOString(),
        })
        .eq('driver_id', driverProfile.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating location:', err);
    }
  };

  const loadActiveHails = async () => {
    if (!driverProfile) return;

    try {
      const { data, error } = await supabase
        .from('passenger_hails')
        .select('*, profiles:passenger_id(full_name)')
        .in('status', ['pending', 'accepted'])
        .eq('keke_fleet_id', driverProfile.id);

      if (error) throw error;

      const formattedHails = (data || []).map((hail: any) => ({
        id: hail.id,
        passengerName: hail.profiles?.full_name || 'Passenger',
        pickupAddress: hail.pickup_address,
        dropoffAddress: hail.dropoff_address,
        status: hail.status,
      }));

      setHails(formattedHails);
    } catch (err) {
      console.error('Error loading hails:', err);
    }
  };

  const handleStartRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!destAddress) {
        alert('Please enter destination');
        setLoading(false);
        return;
      }

      const location = await getCurrentLocation();
      const destLocation = await geocodeAddress(destAddress);

      if (!destLocation) {
        alert('Could not find destination address');
        setLoading(false);
        return;
      }

      const newRoute: Route = {
        id: Math.random().toString(),
        originAddress: 'Current Location',
        destinationAddress: destAddress,
        originLat: location.latitude,
        originLng: location.longitude,
        destLat: destLocation.latitude,
        destLng: destLocation.longitude,
      };

      setSelectedRoute(newRoute);
      setCurrentLocation(location);

      const { error } = await supabase.from('keke_fleets').upsert({
        driver_id: driverProfile!.id,
        current_latitude: location.latitude,
        current_longitude: location.longitude,
        destination_latitude: destLocation.latitude,
        destination_longitude: destLocation.longitude,
        destination_address: destAddress,
        total_seats: driverProfile!.total_seats || 7,
        occupied_seats: occupiedSeats,
        is_active: true,
      });

      if (error) throw error;

      setIsOnRoute(true);
      setDestAddress('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start route');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptHail = async (hailId: string) => {
    try {
      const { error } = await supabase
        .from('passenger_hails')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', hailId);

      if (error) throw error;

      setOccupiedSeats((prev) => Math.min(prev + 1, driverProfile?.total_seats || 7));
      loadActiveHails();
    } catch (err) {
      console.error('Error accepting hail:', err);
    }
  };

  const handleDropoffPassenger = async (hailId: string) => {
    try {
      const { error } = await supabase
        .from('passenger_hails')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', hailId);

      if (error) throw error;

      setOccupiedSeats((prev) => Math.max(prev - 1, 0));
      loadActiveHails();
    } catch (err) {
      console.error('Error dropping off passenger:', err);
    }
  };

  const handleEndRoute = async () => {
    try {
      const { error } = await supabase
        .from('keke_fleets')
        .update({ is_active: false })
        .eq('driver_id', driverProfile!.id);

      if (error) throw error;

      setIsOnRoute(false);
      setSelectedRoute(null);
      setHails([]);
      setOccupiedSeats(0);
    } catch (err) {
      console.error('Error ending route:', err);
    }
  };

  const seatPercentage = ((occupiedSeats / (driverProfile?.total_seats || 7)) * 100).toFixed(0);

  if (!isOnRoute) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <MapPin className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Start Your Route</h2>
              <p className="text-gray-600">Where are you heading today?</p>
            </div>

            <form onSubmit={handleStartRoute} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination Address
                </label>
                <input
                  type="text"
                  value={destAddress}
                  onChange={(e) => setDestAddress(e.target.value)}
                  placeholder="Enter route destination"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  Your Keke will appear on the map with {driverProfile?.total_seats || 7} available seats. Passengers can hail you.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !destAddress}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-lg"
              >
                <Navigation2 className="w-5 h-5" />
                {loading ? 'Starting...' : 'Start Route'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">On Route</h2>
              <p className="text-gray-600 mt-1">{selectedRoute?.destinationAddress}</p>
            </div>
            <button
              onClick={handleEndRoute}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Power className="w-4 h-4" />
              End Route
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Occupied Seats</p>
              <p className="text-3xl font-bold text-green-600">
                {occupiedSeats}/{driverProfile?.total_seats || 7}
              </p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Capacity</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-blue-600">{seatPercentage}%</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      parseInt(seatPercentage) <= 40
                        ? 'bg-green-600'
                        : parseInt(seatPercentage) <= 70
                          ? 'bg-yellow-600'
                          : 'bg-red-600'
                    }`}
                    style={{ width: `${seatPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Active Hails</p>
              <p className="text-3xl font-bold text-yellow-600">{hails.length}</p>
            </div>
          </div>
        </div>

        {hails.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Passenger Hails</h3>
            <div className="space-y-3">
              {hails.map((hail) => (
                <div key={hail.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{hail.passengerName}</p>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{hail.pickupAddress}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                        <Navigation2 className="w-4 h-4" />
                        <span>{hail.dropoffAddress}</span>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        hail.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {hail.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {hail.status === 'pending' && (
                      <button
                        onClick={() => handleAcceptHail(hail.id)}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
                      >
                        Accept Pickup
                      </button>
                    )}
                    {hail.status === 'accepted' && (
                      <button
                        onClick={() => handleDropoffPassenger(hail.id)}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                      >
                        Dropoff
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {hails.length === 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Waiting for passengers to hail your Keke...</p>
          </div>
        )}
      </div>
    </div>
  );
}

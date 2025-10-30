import { useState, useEffect } from 'react';
import { Power, Star, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DriverProfile, Ride } from '../../types';
import { AvailableRides } from './AvailableRides';
import { ActiveRide } from './ActiveRide';
import { watchLocation, clearLocationWatch } from '../../utils/location';

export function DriverDashboard() {
  const { profile, signOut } = useAuth();
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);

  useEffect(() => {
    if (profile) {
      loadDriverProfile();
    }
  }, [profile]);

  useEffect(() => {
    if (driverProfile?.is_available) {
      const watchId = watchLocation((location) => {
        updateDriverLocation(location.latitude, location.longitude);
      });
      setLocationWatchId(watchId);

      return () => {
        if (watchId !== null) {
          clearLocationWatch(watchId);
        }
      };
    } else {
      if (locationWatchId !== null) {
        clearLocationWatch(locationWatchId);
        setLocationWatchId(null);
      }
    }
  }, [driverProfile?.is_available]);

  useEffect(() => {
    if (driverProfile) {
      loadActiveRide();
    }
  }, [driverProfile]);

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

  const loadActiveRide = async () => {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', driverProfile!.id)
        .in('status', ['accepted', 'in_progress'])
        .maybeSingle();

      if (error) throw error;
      setActiveRide(data);
    } catch (err) {
      console.error('Error loading active ride:', err);
    }
  };

  const updateDriverLocation = async (latitude: number, longitude: number) => {
    if (!driverProfile) return;

    try {
      await supabase
        .from('driver_profiles')
        .update({
          current_latitude: latitude,
          current_longitude: longitude,
          last_location_update: new Date().toISOString(),
        })
        .eq('id', driverProfile.id);
    } catch (err) {
      console.error('Error updating location:', err);
    }
  };

  const toggleAvailability = async () => {
    if (!driverProfile) return;

    try {
      const newAvailability = !driverProfile.is_available;
      const { error } = await supabase
        .from('driver_profiles')
        .update({ is_available: newAvailability })
        .eq('id', driverProfile.id);

      if (error) throw error;

      setDriverProfile({ ...driverProfile, is_available: newAvailability });
    } catch (err) {
      console.error('Error toggling availability:', err);
    }
  };

  if (!driverProfile) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Keke Driver</h1>
              <p className="text-sm text-gray-600">Welcome, {profile?.full_name}</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleAvailability}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
                  driverProfile.is_available
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                <Power className="w-4 h-4" />
                {driverProfile.is_available ? 'Online' : 'Offline'}
              </button>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-700 mb-1">
                <Star className="w-4 h-4" />
                <span className="text-sm font-medium">Rating</span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {driverProfile.rating.toFixed(1)}
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-700 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Total Rides</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{driverProfile.total_rides}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-700 mb-1">Vehicle</div>
              <p className="text-lg font-bold text-gray-900">
                {driverProfile.vehicle_plate}
              </p>
              <p className="text-sm text-gray-600">
                {driverProfile.vehicle_color} {driverProfile.vehicle_type}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeRide ? (
          <ActiveRide ride={activeRide} onRideCompleted={() => setActiveRide(null)} />
        ) : (
          <AvailableRides
            driverProfile={driverProfile}
            onRideAccepted={() => loadActiveRide()}
          />
        )}
      </main>
    </div>
  );
}

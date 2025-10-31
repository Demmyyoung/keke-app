import { useState, useEffect } from 'react';
import { Phone, MapPin, Clock, AlertCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Ride, DriverProfile, Profile, Location } from '../../types';
import { GoogleMap } from '../Map/GoogleMap';

interface CurrentRideProps {
  ride: Ride;
  onRideCancelled: () => void;
  onRideCompleted: () => void;
}

export function CurrentRide({ ride, onRideCancelled, onRideCompleted }: CurrentRideProps) {
  const [driver, setDriver] = useState<(DriverProfile & { profile: Profile }) | null>(null);
  const [driverLocation, setDriverLocation] = useState<Location | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    loadDriver();
  }, [ride.driver_id]);

  useEffect(() => {
    if (!ride.driver_id) return;

    const subscription = supabase
      .channel(`driver_${ride.driver_id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'driver_profiles',
          filter: `id=eq.${ride.driver_id}`,
        },
        (payload) => {
          if (payload.new.current_latitude && payload.new.current_longitude) {
            setDriverLocation({
              latitude: payload.new.current_latitude,
              longitude: payload.new.current_longitude,
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [ride.driver_id]);

  useEffect(() => {
    const subscription = supabase
      .channel(`ride_${ride.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rides',
          filter: `id=eq.${ride.id}`,
        },
        (payload) => {
          if (payload.new.status === 'completed') {
            onRideCompleted();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [ride.id, onRideCompleted]);

  const loadDriver = async () => {
    if (!ride.driver_id) return;

    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('*, profile:profiles(*)')
        .eq('id', ride.driver_id)
        .maybeSingle();

      if (error) throw error;
      setDriver(data);

      if (data?.current_latitude && data?.current_longitude) {
        setDriverLocation({
          latitude: data.current_latitude,
          longitude: data.current_longitude,
        });
      }
    } catch (err) {
      console.error('Error loading driver:', err);
    }
  };

  const handleCancelRide = async () => {
    setCancelError('');
    setCancelLoading(true);

    try {
      const { error } = await supabase
        .from('rides')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: 'Cancelled by passenger',
        })
        .eq('id', ride.id);

      if (error) throw error;

      setShowCancelModal(false);
      onRideCancelled();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel ride');
    } finally {
      setCancelLoading(false);
    }
  };

  const getStatusLabel = () => {
    switch (ride.status) {
      case 'accepted':
        return 'Driver Accepted';
      case 'in_progress':
        return 'Ride in Progress';
      default:
        return ride.status;
    }
  };

  const getStatusColor = () => {
    switch (ride.status) {
      case 'accepted':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'in_progress':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="h-80 mb-6">
        <GoogleMap
          pickupLocation={{
            latitude: ride.pickup_latitude,
            longitude: ride.pickup_longitude,
          }}
          dropoffLocation={{
            latitude: ride.dropoff_latitude,
            longitude: ride.dropoff_longitude,
          }}
          driverLocation={driverLocation || undefined}
        />
      </div>

      <div className="px-6 pb-6">
        <div className={`p-4 rounded-lg border mb-6 ${getStatusColor()}`}>
          <p className="font-medium">{getStatusLabel()}</p>
        </div>

        {driver && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Driver Information</h3>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-medium">Name:</span> {driver.profile?.full_name}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Vehicle:</span> {driver.vehicle_color}{' '}
                {driver.vehicle_type} ({driver.vehicle_plate})
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Rating:</span> {driver.rating.toFixed(1)} ⭐
              </p>
              <a
                href={`tel:${driver.profile?.phone}`}
                className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium mt-3"
              >
                <Phone className="w-4 h-4" />
                Call Driver
              </a>
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Pickup</p>
              <p className="text-gray-900">{ride.pickup_address}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Dropoff</p>
              <p className="text-gray-900">{ride.dropoff_address}</p>
            </div>
          </div>
        </div>

        {ride.status === 'accepted' && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition-colors border border-red-200"
          >
            <X className="w-4 h-4" />
            Cancel Ride
          </button>
        )}
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Cancel Ride?</h3>
            </div>

            {cancelError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {cancelError}
              </div>
            )}

            <p className="text-gray-600 mb-6">
              Are you sure you want to cancel this ride? You may incur a cancellation fee.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={cancelLoading}
                className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
              >
                Keep Ride
              </button>
              <button
                onClick={handleCancelRide}
                disabled={cancelLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelLoading ? 'Cancelling...' : 'Cancel Ride'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

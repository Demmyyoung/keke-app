import { useState, useEffect } from 'react';
import { MapPin, Clock, DollarSign, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Ride, DriverProfile } from '../../types';

interface AvailableRidesProps {
  driverProfile: DriverProfile;
  onRideAccepted: () => void;
}

export function AvailableRides({ driverProfile, onRideAccepted }: AvailableRidesProps) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRideId, setProcessingRideId] = useState<string | null>(null);

  useEffect(() => {
    if (driverProfile.is_available && driverProfile.is_approved) {
      loadAvailableRides();

      const subscription = supabase
        .channel('rides')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'rides' },
          () => {
            loadAvailableRides();
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'rides', filter: 'status=eq.pending' },
          (payload) => {
            setRides((current) =>
              current.filter((ride) => ride.id !== (payload.new as Ride).id)
            );
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [driverProfile.is_available, driverProfile.is_approved]);

  const loadAvailableRides = async () => {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: true });

      if (error) throw error;
      setRides(data || []);
    } catch (err) {
      console.error('Error loading rides:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRide = async (rideId: string) => {
    setProcessingRideId(rideId);
    try {
      const { error } = await supabase
        .from('rides')
        .update({
          driver_id: driverProfile.id,
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', rideId)
        .eq('status', 'pending');

      if (error) throw error;

      setRides((current) => current.filter((r) => r.id !== rideId));
      onRideAccepted();
    } catch (err) {
      console.error('Error accepting ride:', err);
      alert('Failed to accept ride. It may have been taken by another driver.');
    } finally {
      setProcessingRideId(null);
    }
  };

  const handleRejectRide = async (rideId: string) => {
    setProcessingRideId(rideId);
    try {
      setRides((current) => current.filter((r) => r.id !== rideId));
    } catch (err) {
      console.error('Error rejecting ride:', err);
    } finally {
      setProcessingRideId(null);
    }
  };

  if (!driverProfile.is_approved) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-700">
          Your driver profile is pending approval. You'll be able to accept rides once approved.
        </p>
      </div>
    );
  }

  if (!driverProfile.is_available) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-700">
          You're currently offline. Toggle your availability to start receiving ride requests.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8">Loading available rides...</div>;
  }

  if (rides.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No rides available</h3>
        <p className="text-gray-600">New ride requests will appear here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Rides ({rides.length})</h2>
      <div className="space-y-4">
        {rides.map((ride) => (
          <div
            key={ride.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {new Date(ride.requested_at).toLocaleString()}
                  </span>
                  {ride.is_scheduled && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Scheduled
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Pickup</p>
                      <p className="text-sm text-gray-700">{ride.pickup_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Dropoff</p>
                      <p className="text-sm text-gray-700">{ride.dropoff_address}</p>
                    </div>
                  </div>
                </div>
                {ride.is_scheduled && ride.scheduled_time && (
                  <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-2 text-sm text-blue-700">
                    Scheduled for: {new Date(ride.scheduled_time).toLocaleString()}
                  </div>
                )}
              </div>
              <div className="text-right ml-4">
                <div className="flex items-center gap-1 text-green-600 font-bold text-lg mb-2">
                  <DollarSign className="w-5 h-5" />
                  <span>₦{ride.fare - ride.service_fee}</span>
                </div>
                <p className="text-xs text-gray-500">Your earnings</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleAcceptRide(ride.id)}
                disabled={processingRideId !== null}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <Check className="w-4 h-4" />
                Accept
              </button>
              <button
                onClick={() => handleRejectRide(ride.id)}
                disabled={processingRideId !== null}
                className="flex-1 flex items-center justify-center gap-2 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                <X className="w-4 h-4" />
                Skip
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Clock, MapPin, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Ride } from '../../types';

export function RideHistory() {
  const { profile } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      loadRides();
    }
  }, [profile]);

  const loadRides = async () => {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('passenger_id', profile!.id)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setRides(data || []);
    } catch (err) {
      console.error('Error loading rides:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'accepted':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading your rides...</div>;
  }

  if (rides.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No rides yet</h3>
        <p className="text-gray-600">Book your first Keke ride to get started!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Ride History</h2>
      <div className="space-y-4">
        {rides.map((ride) => (
          <div
            key={ride.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {new Date(ride.requested_at).toLocaleString()}
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{ride.pickup_address}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{ride.dropoff_address}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                    ride.status
                  )}`}
                >
                  {ride.status}
                </span>
                <p className="text-lg font-bold text-gray-900 mt-2">₦{ride.fare}</p>
              </div>
            </div>
            {ride.is_scheduled && (
              <div className="bg-blue-50 border border-blue-200 rounded p-2 text-sm text-blue-700">
                Scheduled for: {new Date(ride.scheduled_time!).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

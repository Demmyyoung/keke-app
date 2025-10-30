import { useState, useEffect } from 'react';
import { MapPin, Phone, Navigation, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Ride, Profile } from '../../types';

interface ActiveRideProps {
  ride: Ride;
  onRideCompleted: () => void;
}

export function ActiveRide({ ride, onRideCompleted }: ActiveRideProps) {
  const [passenger, setPassenger] = useState<Profile | null>(null);
  const [status, setStatus] = useState(ride.status);

  useEffect(() => {
    loadPassenger();
  }, [ride.passenger_id]);

  const loadPassenger = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', ride.passenger_id)
        .maybeSingle();

      if (error) throw error;
      setPassenger(data);
    } catch (err) {
      console.error('Error loading passenger:', err);
    }
  };

  const handleStartRide = async () => {
    try {
      const { error } = await supabase
        .from('rides')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', ride.id);

      if (error) throw error;
      setStatus('in_progress');
    } catch (err) {
      console.error('Error starting ride:', err);
    }
  };

  const handleCompleteRide = async () => {
    try {
      const { error } = await supabase
        .from('rides')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', ride.id);

      if (error) throw error;

      await supabase
        .from('driver_profiles')
        .update({
          total_rides: supabase.rpc('increment', { x: 1 }),
        })
        .eq('id', ride.driver_id);

      onRideCompleted();
    } catch (err) {
      console.error('Error completing ride:', err);
    }
  };

  const openInMaps = (lat: number, lng: number, label: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Active Ride</h2>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            status === 'accepted'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {status === 'accepted' ? 'Accepted' : 'In Progress'}
        </span>
      </div>

      {passenger && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Passenger Information</h3>
          <p className="text-gray-700">{passenger.full_name}</p>
          <a
            href={`tel:${passenger.phone}`}
            className="flex items-center gap-2 text-green-600 hover:text-green-700 mt-2"
          >
            <Phone className="w-4 h-4" />
            {passenger.phone}
          </a>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <div className="border-l-4 border-green-600 pl-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">Pickup Location</h3>
              </div>
              <p className="text-gray-700">{ride.pickup_address}</p>
            </div>
            <button
              onClick={() => openInMaps(ride.pickup_latitude, ride.pickup_longitude, 'Pickup')}
              className="ml-2 p-2 text-green-600 hover:bg-green-50 rounded-md"
            >
              <Navigation className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="border-l-4 border-red-600 pl-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-5 h-5 text-red-600" />
                <h3 className="font-semibold text-gray-900">Dropoff Location</h3>
              </div>
              <p className="text-gray-700">{ride.dropoff_address}</p>
            </div>
            <button
              onClick={() => openInMaps(ride.dropoff_latitude, ride.dropoff_longitude, 'Dropoff')}
              className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-md"
            >
              <Navigation className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-700 font-medium">Your Earnings</span>
          <span className="text-2xl font-bold text-green-600">
            ₦{ride.fare - ride.service_fee}
          </span>
        </div>
        <p className="text-xs text-gray-600 mt-1">
          Total fare: ₦{ride.fare} (₦{ride.service_fee} service fee)
        </p>
      </div>

      {status === 'accepted' && (
        <button
          onClick={handleStartRide}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          Start Ride
        </button>
      )}

      {status === 'in_progress' && (
        <button
          onClick={handleCompleteRide}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-5 h-5" />
          Complete Ride
        </button>
      )}
    </div>
  );
}

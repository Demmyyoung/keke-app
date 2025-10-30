import { useState, useEffect } from 'react';
import { MapPin, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getCurrentLocation, isWithinZone } from '../../utils/location';
import { UniversityZone, Location } from '../../types';

export function RideBooking() {
  const { profile } = useAuth();
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState<Location | null>(null);
  const [fare, setFare] = useState(100);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [zones, setZones] = useState<UniversityZone[]>([]);

  useEffect(() => {
    loadZones();
    loadCurrentLocation();
  }, []);

  const loadZones = async () => {
    const { data, error } = await supabase
      .from('university_zones')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error loading zones:', error);
    } else if (data) {
      setZones(data);
    }
  };

  const loadCurrentLocation = async () => {
    try {
      const location = await getCurrentLocation();
      setCurrentLocation(location);
    } catch (err) {
      setError('Unable to get your location. Please enable location services.');
    }
  };

  const verifyLocation = () => {
    if (!currentLocation || zones.length === 0) return false;

    for (const zone of zones) {
      if (isWithinZone(currentLocation, zone)) {
        return true;
      }
    }
    return false;
  };

  const handleBookRide = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!profile?.is_verified) {
      setError('Your account needs to be verified before booking a ride.');
      return;
    }

    if (!currentLocation) {
      setError('Unable to determine your location.');
      return;
    }

    if (!verifyLocation()) {
      setError('You must be within the university area to book a ride.');
      return;
    }

    if (!dropoffLocation) {
      setError('Please enter a valid dropoff location.');
      return;
    }

    if (isScheduled && !scheduledTime) {
      setError('Please select a time for your scheduled ride.');
      return;
    }

    setLoading(true);

    try {
      const rideData = {
        passenger_id: profile.id,
        pickup_latitude: currentLocation.latitude,
        pickup_longitude: currentLocation.longitude,
        pickup_address: pickupAddress || 'Current Location',
        dropoff_latitude: dropoffLocation.latitude,
        dropoff_longitude: dropoffLocation.longitude,
        dropoff_address: dropoffAddress,
        fare: isScheduled ? fare + 50 : fare,
        service_fee: 10,
        is_scheduled: isScheduled,
        scheduled_time: isScheduled ? scheduledTime : null,
      };

      const { error: insertError } = await supabase
        .from('rides')
        .insert(rideData);

      if (insertError) throw insertError;

      setSuccess('Ride booked successfully! Waiting for a driver to accept.');
      setPickupAddress('');
      setDropoffAddress('');
      setDropoffLocation(null);
      setScheduledTime('');
      setIsScheduled(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book ride');
    } finally {
      setLoading(false);
    }
  };

  const estimateDropoffLocation = (address: string) => {
    if (address && currentLocation) {
      const offset = 0.01;
      setDropoffLocation({
        latitude: currentLocation.latitude + offset,
        longitude: currentLocation.longitude + offset,
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Book a Keke</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md">
          {success}
        </div>
      )}

      {!profile?.is_verified && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-md">
          Your account is pending verification. You'll be able to book rides once verified.
        </div>
      )}

      <form onSubmit={handleBookRide} className="space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <MapPin className="w-4 h-4" />
            Pickup Location
          </label>
          <input
            type="text"
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
            placeholder="Current location (auto-detected)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {currentLocation && (
            <p className="text-xs text-gray-500 mt-1">
              Lat: {currentLocation.latitude.toFixed(6)}, Lng: {currentLocation.longitude.toFixed(6)}
            </p>
          )}
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <MapPin className="w-4 h-4" />
            Dropoff Location
          </label>
          <input
            type="text"
            value={dropoffAddress}
            onChange={(e) => {
              setDropoffAddress(e.target.value);
              estimateDropoffLocation(e.target.value);
            }}
            placeholder="Enter destination"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="scheduled"
            checked={isScheduled}
            onChange={(e) => setIsScheduled(e.target.checked)}
            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
          />
          <label htmlFor="scheduled" className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Calendar className="w-4 h-4" />
            Schedule for later (+₦50)
          </label>
        </div>

        {isScheduled && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pickup Time
            </label>
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              required={isScheduled}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Base Fare</span>
            <span className="font-medium">₦{fare}</span>
          </div>
          {isScheduled && (
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Scheduled Ride Fee</span>
              <span className="font-medium">₦50</span>
            </div>
          )}
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Service Fee</span>
            <span className="font-medium">₦10</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span>₦{isScheduled ? fare + 60 : fare + 10}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !profile?.is_verified}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {loading ? 'Booking...' : 'Book Ride'}
        </button>
      </form>
    </div>
  );
}

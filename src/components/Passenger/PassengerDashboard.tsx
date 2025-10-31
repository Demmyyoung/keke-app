import { useState, useEffect } from 'react';
import { History, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Ride, DriverProfile } from '../../types';
import { RideBooking } from './RideBooking';
import { RideHistory } from './RideHistory';
import { CurrentRide } from './CurrentRide';
import { RidePayment } from './RidePayment';
import { RideRating } from './RideRating';

type Tab = 'book' | 'history';

export function PassengerDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('book');
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [loadingRide, setLoadingRide] = useState(true);

  useEffect(() => {
    if (profile) {
      loadActiveRide();
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    const subscription = supabase
      .channel(`passenger_rides_${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rides',
          filter: `passenger_id=eq.${profile.id}`,
        },
        (payload) => {
          const updatedRide = payload.new as Ride;
          if (updatedRide.status === 'completed') {
            setActiveRide(updatedRide);
            setShowPayment(true);
          } else if (updatedRide.status === 'cancelled') {
            setActiveRide(null);
            setShowPayment(false);
            setShowRating(false);
          } else if (updatedRide.status === 'in_progress' || updatedRide.status === 'accepted') {
            setActiveRide(updatedRide);
            if (updatedRide.driver_id && !driver) {
              loadDriver(updatedRide.driver_id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile, driver]);

  const loadActiveRide = async () => {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('passenger_id', profile!.id)
        .in('status', ['accepted', 'in_progress'])
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setActiveRide(data);
        if (data.driver_id) {
          loadDriver(data.driver_id);
        }
      }
    } catch (err) {
      console.error('Error loading active ride:', err);
    } finally {
      setLoadingRide(false);
    }
  };

  const loadDriver = async (driverId: string) => {
    try {
      const { data, error } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('id', driverId)
        .maybeSingle();

      if (error) throw error;
      setDriver(data);
    } catch (err) {
      console.error('Error loading driver:', err);
    }
  };

  const handleRideCancelled = () => {
    setActiveRide(null);
    setDriver(null);
    setShowPayment(false);
    setShowRating(false);
  };

  const handleRideCompleted = () => {
    setShowPayment(true);
  };

  const handlePaymentComplete = () => {
    setShowPayment(false);
    if (driver) {
      setShowRating(true);
    }
  };

  const handleRatingComplete = () => {
    setShowRating(false);
    setActiveRide(null);
    setDriver(null);
    setActiveTab('history');
  };

  if (activeRide && !loadingRide) {
    if (showPayment) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
          <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Keke Ride</h1>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <RidePayment ride={activeRide} onPaymentComplete={handlePaymentComplete} />
          </main>
        </div>
      );
    }

    if (showRating && driver) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
          <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Keke Ride</h1>
              <button
                onClick={() => signOut()}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <RideRating ride={activeRide} driver={driver} onRatingComplete={handleRatingComplete} />
          </main>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Keke Ride</h1>
            <button
              onClick={() => signOut()}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <CurrentRide
            ride={activeRide}
            onRideCancelled={handleRideCancelled}
            onRideCompleted={handleRideCompleted}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Keke Ride</h1>
            <p className="text-sm text-gray-600">Welcome, {profile?.full_name}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex gap-4">
          <button
            onClick={() => setActiveTab('book')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'book'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <User className="w-4 h-4" />
            Book Ride
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <History className="w-4 h-4" />
            History
          </button>
        </div>

        {activeTab === 'book' && <RideBooking />}
        {activeTab === 'history' && <RideHistory />}
      </main>
    </div>
  );
}

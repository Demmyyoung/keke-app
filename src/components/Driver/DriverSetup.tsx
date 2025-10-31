import { useState } from 'react';
import { Car, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DriverSetupPayment } from './DriverSetupPayment';

export function DriverSetup({ onComplete }: { onComplete: () => void }) {
  const { profile } = useAuth();
  const [step, setStep] = useState<'profile' | 'payment'>('profile');
  const [driverId, setDriverId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    vehicle_type: 'Keke NAPEP',
    vehicle_plate: '',
    vehicle_color: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error: insertError } = await supabase
        .from('driver_profiles')
        .insert({
          user_id: profile!.id,
          ...formData,
        })
        .select();

      if (insertError) throw insertError;
      if (!data || data.length === 0) throw new Error('Failed to create driver profile');

      setDriverId(data[0].id);
      setStep('payment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create driver profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentComplete = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center mb-6">
          <Car className="w-12 h-12 text-green-600" />
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                step === 'profile' || step === 'payment'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              1
            </div>
            <div className="flex-1 mx-2 h-0.5 bg-gray-300"></div>
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                step === 'payment' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              2
            </div>
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>Vehicle Info</span>
            <span>Payment</span>
          </div>
        </div>

        {step === 'profile' && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Complete Driver Profile
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Type
                </label>
                <input
                  type="text"
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Plate Number
                </label>
                <input
                  type="text"
                  value={formData.vehicle_plate}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicle_plate: e.target.value.toUpperCase() })
                  }
                  required
                  placeholder="ABC123XY"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Color
                </label>
                <input
                  type="text"
                  value={formData.vehicle_color}
                  onChange={(e) => setFormData({ ...formData, vehicle_color: e.target.value })}
                  required
                  placeholder="Yellow"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? 'Submitting...' : 'Continue'}
                {!loading && <ChevronRight className="w-4 h-4" />}
              </button>
            </form>
          </>
        )}

        {step === 'payment' && driverId && (
          <>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Link Payment Account
            </h2>

            <DriverSetupPayment
              driverId={driverId}
              onPaymentSetupComplete={handlePaymentComplete}
            />
          </>
        )}
      </div>
    </div>
  );
}

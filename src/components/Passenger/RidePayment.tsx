import { useState } from 'react';
import { CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Ride } from '../../types';

interface RidePaymentProps {
  ride: Ride;
  onPaymentComplete: () => void;
}

declare global {
  interface Window {
    PaystackPop: any;
  }
}

export function RidePayment({ ride, onPaymentComplete }: RidePaymentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | null>(null);

  const loadPaystackScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.PaystackPop) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Paystack'));
      document.head.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setError('');
    setLoading(true);
    setPaymentStatus('processing');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !anonKey) {
        throw new Error('Supabase configuration missing');
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user.email) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/initialize-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          ride_id: ride.id,
          email: session.session.user.email,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to initialize payment');
      }

      await loadPaystackScript();

      const handler = window.PaystackPop.setup({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        email: session.session.user.email,
        amount: ride.fare * 100 + ride.service_fee * 100,
        ref: data.reference,
        onClose: () => {
          setPaymentStatus('pending');
          setLoading(false);
        },
        onSuccess: (transaction: any) => {
          verifyPayment(data.reference);
        },
      });

      handler.openIframe();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment initialization failed');
      setPaymentStatus('pending');
      setLoading(false);
    }
  };

  const verifyPayment = async (reference: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-anon-key': anonKey,
        },
        body: JSON.stringify({ reference }),
      });

      const data = await response.json();

      if (data.success && data.status === 'success') {
        setPaymentStatus('success');
        setTimeout(() => {
          onPaymentComplete();
        }, 2000);
      } else {
        setError('Payment verification failed. Please try again.');
        setPaymentStatus('pending');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment verification failed');
      setPaymentStatus('pending');
    } finally {
      setLoading(false);
    }
  };

  if (paymentStatus === 'success') {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful</h2>
        <p className="text-gray-600">Your ride has been completed and paid for.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Finalize Payment</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Base Fare</span>
          <span className="font-medium">₦{ride.fare}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Service Fee</span>
          <span className="font-medium">₦{ride.service_fee}</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-bold">
          <span>Total Amount</span>
          <span>₦{ride.fare + ride.service_fee}</span>
        </div>
      </div>

      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        <CreditCard className="w-5 h-5" />
        {loading ? 'Processing...' : 'Pay with Paystack'}
      </button>

      <p className="text-xs text-gray-500 text-center mt-4">
        Secure payment powered by Paystack
      </p>
    </div>
  );
}

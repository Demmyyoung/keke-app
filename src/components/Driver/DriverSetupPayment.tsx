import { useState } from 'react';
import { AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DriverSetupPaymentProps {
  driverId: string;
  onPaymentSetupComplete: (subaccountCode: string) => void;
}

// Full list of Nigerian banks for easy selection.
const NIGERIAN_BANKS = [
  { code: '044', name: 'Access Bank' },
  { code: '063', name: 'Access Bank (Diamond)' },
  { code: '050', name: 'EcoBank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '035', name: 'Wema Bank' },
  { code: '076', name: 'Skye Bank (Polaris)' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '214', name: 'First City Monument Bank (FCMB)' },
  { code: '301', name: 'Jaiz Bank' },
  { code: '090', name: 'Providus Bank' },
  { code: '101', name: 'Wema Bank (ALAT)' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '304', name: 'Stanbic Mobile Money' },
  { code: '308', name: 'TagPay' },
  { code: '309', name: 'Paycom (Opay)' },
  { code: '990', name: 'Globus Bank' },
  { code: '103', name: 'Titan Trust Bank' },
  { code: '080', name: 'Heritage Bank' },
  { code: '565', name: 'Coronation Merchant Bank' },
];

export function DriverSetupPayment({ driverId, onPaymentSetupComplete }: DriverSetupPaymentProps) {
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // NOTE: nigerianBanks replaced with NIGERIAN_BANKS

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !anonKey) {
        throw new Error('Supabase configuration missing');
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/create-paystack-subaccount`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          business_name: `Keke Driver ${driverId.slice(0, 8)}`,
          settlement_bank: bankName, // bankName now holds the Paystack bank code
          account_number: accountNumber,
          percentage_charge: 10,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create payment account');
      }

      const { error: updateError } = await supabase
        .from('driver_profiles')
        .update({ paystack_subaccount_code: data.subaccount_code })
        .eq('id', driverId);

      if (updateError) throw updateError;

      onPaymentSetupComplete(data.subaccount_code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up payment account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-700">
          Link your bank account to receive payment for completed rides.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Your Bank
        </label>
        <select
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">Choose a bank</option>
          {NIGERIAN_BANKS.map((bank) => (
            <option key={bank.code} value={bank.code}>
              {bank.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Account Number
        </label>
        <input
          type="text"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="0123456789"
          required
          pattern="\d{10}"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <p className="text-xs text-gray-500 mt-1">Enter your 10-digit account number</p>
      </div>

      <button
        type="submit"
        disabled={loading || !bankName || accountNumber.length !== 10}
        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {loading && <Loader className="w-4 h-4 animate-spin" />}
        {loading ? 'Setting up...' : 'Link Bank Account'}
      </button>
    </form>
  );
}
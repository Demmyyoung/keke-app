import { useState } from 'react';
import { History, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { RideBooking } from './RideBooking';
import { RideHistory } from './RideHistory';

type Tab = 'book' | 'history';

export function PassengerDashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('book');

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

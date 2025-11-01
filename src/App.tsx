import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';
import { SignupForm } from './components/Auth/SignupForm';
import { PassengerDashboard } from './components/Passenger/PassengerDashboard';
import { DriverSetup } from './components/Driver/DriverSetup';
import { KekeRouteDashboard } from './components/Driver/KekeRouteDashboard';

function App() {
  const { user, profile, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(true);
  const [driverSetupComplete, setDriverSetupComplete] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        {showLogin ? (
          <LoginForm onToggle={() => setShowLogin(false)} />
        ) : (
          <SignupForm onToggle={() => setShowLogin(true)} />
        )}
      </div>
    );
  }

  if (profile.user_type === 'driver' && !driverSetupComplete) {
    return <DriverSetup onComplete={() => setDriverSetupComplete(true)} />;
  }

  if (profile.user_type === 'passenger') {
    return <PassengerDashboard />;
  }

  return <KekeRouteDashboard />;
}

export default App;

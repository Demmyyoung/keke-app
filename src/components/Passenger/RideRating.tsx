import { useState } from 'react';
import { Star, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Ride, DriverProfile } from '../../types';

interface RideRatingProps {
  ride: Ride;
  driver: DriverProfile;
  onRatingComplete: () => void;
}

export function RideRating({ ride, driver, onRatingComplete }: RideRatingProps) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user.id) {
        throw new Error('User not authenticated');
      }

      const { error: insertError } = await supabase
        .from('ride_ratings')
        .insert({
          ride_id: ride.id,
          driver_id: driver.id,
          passenger_id: session.session.user.id,
          rating,
          comment: comment || null,
        });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        onRatingComplete();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">
          {[...Array(rating)].map((_, i) => (
            <span key={i}>⭐</span>
          ))}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
        <p className="text-gray-600">Your rating has been submitted.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Rate Your Ride</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className="text-gray-700 font-medium mb-3">How was your ride?</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className={`p-2 transition-transform ${rating >= value ? 'text-yellow-400' : 'text-gray-300'} hover:scale-110`}
              >
                <Star
                  className={`w-8 h-8 ${rating >= value ? 'fill-current' : ''}`}
                />
              </button>
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Comments (Optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us about your experience..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          <Send className="w-4 h-4" />
          {loading ? 'Submitting...' : 'Submit Rating'}
        </button>
      </form>
    </div>
  );
}

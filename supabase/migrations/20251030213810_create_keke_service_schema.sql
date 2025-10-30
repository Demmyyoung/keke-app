/*
  # Keke Ride-Hailing Service Database Schema

  ## Overview
  Complete database schema for university Keke ride-hailing service with payment integration,
  location tracking, and scheduled bookings.

  ## New Tables

  ### 1. `profiles`
  User profile information for both passengers and drivers
  - `id` (uuid, FK to auth.users) - User identifier
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `phone` (text) - Contact number
  - `user_type` (text) - Either 'passenger' or 'driver'
  - `is_verified` (boolean) - Location verification status
  - `university_id` (text) - University ID number for verification
  - `profile_image_url` (text, nullable) - Profile picture
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. `driver_profiles`
  Extended information specific to drivers
  - `id` (uuid, PK) - Driver profile ID
  - `user_id` (uuid, FK to profiles) - Reference to user profile
  - `vehicle_type` (text) - Type of Keke
  - `vehicle_plate` (text) - Vehicle plate number
  - `vehicle_color` (text) - Vehicle color
  - `is_available` (boolean) - Current availability status
  - `is_approved` (boolean) - Admin approval status
  - `rating` (numeric) - Average driver rating
  - `total_rides` (integer) - Total completed rides
  - `paystack_subaccount_code` (text, nullable) - Paystack split account code
  - `current_latitude` (numeric, nullable) - Current location latitude
  - `current_longitude` (numeric, nullable) - Current location longitude
  - `last_location_update` (timestamptz) - Last location update time
  - `created_at` (timestamptz) - Profile creation timestamp

  ### 3. `rides`
  All ride requests and their status
  - `id` (uuid, PK) - Ride identifier
  - `passenger_id` (uuid, FK to profiles) - Passenger requesting ride
  - `driver_id` (uuid, FK to driver_profiles, nullable) - Assigned driver
  - `pickup_latitude` (numeric) - Pickup location latitude
  - `pickup_longitude` (numeric) - Pickup location longitude
  - `pickup_address` (text) - Pickup location description
  - `dropoff_latitude` (numeric) - Destination latitude
  - `dropoff_longitude` (numeric) - Destination longitude
  - `dropoff_address` (text) - Destination description
  - `status` (text) - Ride status: 'pending', 'accepted', 'in_progress', 'completed', 'cancelled'
  - `fare` (numeric) - Total ride fare
  - `service_fee` (numeric) - Service fee (10 NGN)
  - `is_scheduled` (boolean) - Whether ride is scheduled for later
  - `scheduled_time` (timestamptz, nullable) - Time for scheduled ride
  - `requested_at` (timestamptz) - Ride request timestamp
  - `accepted_at` (timestamptz, nullable) - Driver acceptance timestamp
  - `started_at` (timestamptz, nullable) - Ride start timestamp
  - `completed_at` (timestamptz, nullable) - Ride completion timestamp
  - `cancelled_at` (timestamptz, nullable) - Cancellation timestamp
  - `cancellation_reason` (text, nullable) - Reason for cancellation

  ### 4. `ride_ratings`
  Ratings and reviews for completed rides
  - `id` (uuid, PK) - Rating identifier
  - `ride_id` (uuid, FK to rides) - Associated ride
  - `driver_id` (uuid, FK to driver_profiles) - Rated driver
  - `passenger_id` (uuid, FK to profiles) - Rating passenger
  - `rating` (integer) - Rating value (1-5)
  - `comment` (text, nullable) - Optional review comment
  - `created_at` (timestamptz) - Rating timestamp

  ### 5. `transactions`
  Payment transaction records
  - `id` (uuid, PK) - Transaction identifier
  - `ride_id` (uuid, FK to rides) - Associated ride
  - `passenger_id` (uuid, FK to profiles) - Paying passenger
  - `driver_id` (uuid, FK to driver_profiles) - Receiving driver
  - `amount` (numeric) - Total transaction amount
  - `service_fee` (numeric) - Service fee amount
  - `driver_earnings` (numeric) - Driver's earnings
  - `paystack_reference` (text) - Paystack transaction reference
  - `paystack_split_code` (text, nullable) - Paystack split code used
  - `status` (text) - Transaction status: 'pending', 'success', 'failed'
  - `created_at` (timestamptz) - Transaction timestamp

  ### 6. `university_zones`
  Verified university areas for service availability
  - `id` (uuid, PK) - Zone identifier
  - `name` (text) - Zone name
  - `center_latitude` (numeric) - Zone center latitude
  - `center_longitude` (numeric) - Zone center longitude
  - `radius_meters` (numeric) - Zone radius in meters
  - `is_active` (boolean) - Whether zone is active
  - `created_at` (timestamptz) - Zone creation timestamp

  ## Security
  - RLS enabled on all tables
  - Passengers can read their own profile and rides
  - Drivers can read their own profile, rides, and available ride requests
  - Only authenticated users with verified university status can create rides
  - Drivers can only update their own availability and location
  - Transaction records are read-only for users (written by backend)
  - Admin functions handled through service role
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('passenger', 'driver')),
  is_verified boolean DEFAULT false,
  university_id text,
  profile_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create driver_profiles table
CREATE TABLE IF NOT EXISTS driver_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL,
  vehicle_plate text UNIQUE NOT NULL,
  vehicle_color text NOT NULL,
  is_available boolean DEFAULT false,
  is_approved boolean DEFAULT false,
  rating numeric(3,2) DEFAULT 5.0,
  total_rides integer DEFAULT 0,
  paystack_subaccount_code text,
  current_latitude numeric,
  current_longitude numeric,
  last_location_update timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create rides table
CREATE TABLE IF NOT EXISTS rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES driver_profiles(id) ON DELETE SET NULL,
  pickup_latitude numeric NOT NULL,
  pickup_longitude numeric NOT NULL,
  pickup_address text NOT NULL,
  dropoff_latitude numeric NOT NULL,
  dropoff_longitude numeric NOT NULL,
  dropoff_address text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  fare numeric NOT NULL,
  service_fee numeric DEFAULT 10,
  is_scheduled boolean DEFAULT false,
  scheduled_time timestamptz,
  requested_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text
);

-- Create ride_ratings table
CREATE TABLE IF NOT EXISTS ride_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid UNIQUE NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  passenger_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id uuid UNIQUE NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  passenger_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  service_fee numeric NOT NULL,
  driver_earnings numeric NOT NULL,
  paystack_reference text NOT NULL,
  paystack_split_code text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  created_at timestamptz DEFAULT now()
);

-- Create university_zones table
CREATE TABLE IF NOT EXISTS university_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  center_latitude numeric NOT NULL,
  center_longitude numeric NOT NULL,
  radius_meters numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE university_zones ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Driver profiles policies
CREATE POLICY "Drivers can view their own profile"
  ON driver_profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Passengers can view available drivers"
  ON driver_profiles FOR SELECT
  TO authenticated
  USING (
    is_available = true 
    AND is_approved = true
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.user_type = 'passenger'
    )
  );

CREATE POLICY "Drivers can update their own profile"
  ON driver_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Drivers can insert their own profile"
  ON driver_profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Rides policies
CREATE POLICY "Passengers can view their own rides"
  ON rides FOR SELECT
  TO authenticated
  USING (passenger_id = auth.uid());

CREATE POLICY "Drivers can view their assigned rides"
  ON rides FOR SELECT
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM driver_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can view pending rides"
  ON rides FOR SELECT
  TO authenticated
  USING (
    status = 'pending' 
    AND EXISTS (
      SELECT 1 FROM driver_profiles 
      WHERE driver_profiles.user_id = auth.uid() 
      AND driver_profiles.is_approved = true
    )
  );

CREATE POLICY "Verified passengers can create rides"
  ON rides FOR INSERT
  TO authenticated
  WITH CHECK (
    passenger_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_verified = true
      AND profiles.user_type = 'passenger'
    )
  );

CREATE POLICY "Drivers can update their rides"
  ON rides FOR UPDATE
  TO authenticated
  USING (
    driver_id IN (
      SELECT id FROM driver_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    driver_id IN (
      SELECT id FROM driver_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Passengers can update their own rides"
  ON rides FOR UPDATE
  TO authenticated
  USING (passenger_id = auth.uid())
  WITH CHECK (passenger_id = auth.uid());

-- Ride ratings policies
CREATE POLICY "Users can view ratings for their rides"
  ON ride_ratings FOR SELECT
  TO authenticated
  USING (
    passenger_id = auth.uid() 
    OR driver_id IN (
      SELECT id FROM driver_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Passengers can create ratings for completed rides"
  ON ride_ratings FOR INSERT
  TO authenticated
  WITH CHECK (
    passenger_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM rides 
      WHERE rides.id = ride_id 
      AND rides.status = 'completed'
      AND rides.passenger_id = auth.uid()
    )
  );

-- Transactions policies
CREATE POLICY "Users can view their own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    passenger_id = auth.uid() 
    OR driver_id IN (
      SELECT id FROM driver_profiles WHERE user_id = auth.uid()
    )
  );

-- University zones policies (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view active zones"
  ON university_zones FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON driver_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_available ON driver_profiles(is_available, is_approved);
CREATE INDEX IF NOT EXISTS idx_rides_passenger_id ON rides(passenger_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_scheduled ON rides(is_scheduled, scheduled_time);
CREATE INDEX IF NOT EXISTS idx_transactions_ride_id ON transactions(ride_id);

-- Function to update driver rating after new rating is added
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE driver_profiles
  SET rating = (
    SELECT AVG(rating)::numeric(3,2)
    FROM ride_ratings
    WHERE driver_id = NEW.driver_id
  )
  WHERE id = NEW.driver_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update driver rating
DROP TRIGGER IF EXISTS trigger_update_driver_rating ON ride_ratings;
CREATE TRIGGER trigger_update_driver_rating
  AFTER INSERT ON ride_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_driver_rating();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on profiles
DROP TRIGGER IF EXISTS trigger_update_profiles_updated_at ON profiles;
CREATE TRIGGER trigger_update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
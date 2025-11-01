/*
  # Update Schema for Keke Fleet Model

  1. Changes
    - Add 'keke_routes' table for managing Keke destinations and routes
    - Add 'keke_fleets' table to group active Kekes
    - Add 'passenger_hails' table for ride requests
    - Add seat capacity fields to driver_profiles
    - Add current route/destination fields
    
  2. New Tables
    - `keke_routes` - Active routes with destinations
    - `keke_fleets` - Groups of active Kekes on same route
    - `passenger_hails` - Hail requests from passengers
*/

-- Create keke_routes table
CREATE TABLE IF NOT EXISTS keke_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_latitude numeric NOT NULL,
  origin_longitude numeric NOT NULL,
  origin_address text NOT NULL,
  destination_latitude numeric NOT NULL,
  destination_longitude numeric NOT NULL,
  destination_address text NOT NULL,
  route_name text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create keke_fleets table
CREATE TABLE IF NOT EXISTS keke_fleets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid UNIQUE NOT NULL REFERENCES driver_profiles(id) ON DELETE CASCADE,
  current_route_id uuid REFERENCES keke_routes(id) ON DELETE SET NULL,
  current_latitude numeric NOT NULL,
  current_longitude numeric NOT NULL,
  destination_latitude numeric NOT NULL,
  destination_longitude numeric NOT NULL,
  total_seats integer NOT NULL,
  occupied_seats integer DEFAULT 0,
  is_active boolean DEFAULT true,
  last_location_update timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create passenger_hails table
CREATE TABLE IF NOT EXISTS passenger_hails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  keke_fleet_id uuid NOT NULL REFERENCES keke_fleets(id) ON DELETE CASCADE,
  pickup_latitude numeric NOT NULL,
  pickup_longitude numeric NOT NULL,
  pickup_address text NOT NULL,
  dropoff_latitude numeric NOT NULL,
  dropoff_longitude numeric NOT NULL,
  dropoff_address text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'picked_up', 'completed', 'cancelled')),
  fare numeric NOT NULL,
  service_fee numeric DEFAULT 10,
  hailed_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  picked_up_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz
);

-- Update driver_profiles to include seat capacity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'total_seats'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN total_seats integer DEFAULT 7;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'driver_profiles' AND column_name = 'current_route_id'
  ) THEN
    ALTER TABLE driver_profiles ADD COLUMN current_route_id uuid REFERENCES keke_routes(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE keke_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE keke_fleets ENABLE ROW LEVEL SECURITY;
ALTER TABLE passenger_hails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for keke_routes
CREATE POLICY "Public can view active routes"
  ON keke_routes FOR SELECT
  USING (is_active = true);

-- RLS Policies for keke_fleets
CREATE POLICY "Passengers can view active Kekes"
  ON keke_fleets FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Drivers can view their own fleet"
  ON keke_fleets FOR SELECT
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Drivers can update their own fleet"
  ON keke_fleets FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid())
  WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Drivers can insert their own fleet"
  ON keke_fleets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM driver_profiles 
      WHERE driver_profiles.id = (
        SELECT id FROM driver_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for passenger_hails
CREATE POLICY "Passengers can view their own hails"
  ON passenger_hails FOR SELECT
  TO authenticated
  USING (passenger_id = auth.uid());

CREATE POLICY "Drivers can view hails for their Keke"
  ON passenger_hails FOR SELECT
  TO authenticated
  USING (
    keke_fleet_id IN (
      SELECT id FROM keke_fleets WHERE driver_id IN (
        SELECT id FROM driver_profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Passengers can create hails"
  ON passenger_hails FOR INSERT
  TO authenticated
  WITH CHECK (
    passenger_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.is_verified = true
    )
  );

CREATE POLICY "Passengers can update their hails"
  ON passenger_hails FOR UPDATE
  TO authenticated
  USING (passenger_id = auth.uid())
  WITH CHECK (passenger_id = auth.uid());

CREATE POLICY "Drivers can update hails for their Keke"
  ON passenger_hails FOR UPDATE
  TO authenticated
  USING (
    keke_fleet_id IN (
      SELECT id FROM keke_fleets WHERE driver_id IN (
        SELECT id FROM driver_profiles WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    keke_fleet_id IN (
      SELECT id FROM keke_fleets WHERE driver_id IN (
        SELECT id FROM driver_profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_keke_fleets_active ON keke_fleets(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_keke_fleets_driver ON keke_fleets(driver_id);
CREATE INDEX IF NOT EXISTS idx_keke_fleets_route ON keke_fleets(current_route_id);
CREATE INDEX IF NOT EXISTS idx_passenger_hails_passenger ON passenger_hails(passenger_id);
CREATE INDEX IF NOT EXISTS idx_passenger_hails_keke ON passenger_hails(keke_fleet_id);
CREATE INDEX IF NOT EXISTS idx_passenger_hails_status ON passenger_hails(status);

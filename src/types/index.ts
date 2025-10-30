export type UserType = 'passenger' | 'driver';

export type RideStatus = 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';

export type TransactionStatus = 'pending' | 'success' | 'failed';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  user_type: UserType;
  is_verified: boolean;
  university_id?: string;
  profile_image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface DriverProfile {
  id: string;
  user_id: string;
  vehicle_type: string;
  vehicle_plate: string;
  vehicle_color: string;
  is_available: boolean;
  is_approved: boolean;
  rating: number;
  total_rides: number;
  paystack_subaccount_code?: string;
  current_latitude?: number;
  current_longitude?: number;
  last_location_update?: string;
  created_at: string;
}

export interface Ride {
  id: string;
  passenger_id: string;
  driver_id?: string;
  pickup_latitude: number;
  pickup_longitude: number;
  pickup_address: string;
  dropoff_latitude: number;
  dropoff_longitude: number;
  dropoff_address: string;
  status: RideStatus;
  fare: number;
  service_fee: number;
  is_scheduled: boolean;
  scheduled_time?: string;
  requested_at: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
}

export interface RideRating {
  id: string;
  ride_id: string;
  driver_id: string;
  passenger_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  ride_id: string;
  passenger_id: string;
  driver_id: string;
  amount: number;
  service_fee: number;
  driver_earnings: number;
  paystack_reference: string;
  paystack_split_code?: string;
  status: TransactionStatus;
  created_at: string;
}

export interface UniversityZone {
  id: string;
  name: string;
  center_latitude: number;
  center_longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string;
}

export interface Location {
  latitude: number;
  longitude: number;
}

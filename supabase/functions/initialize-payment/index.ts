import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { ride_id, email } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!paystackSecretKey) {
      throw new Error("Paystack secret key not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: ride, error: rideError } = await supabase
      .from("rides")
      .select("*, driver_profiles!inner(paystack_subaccount_code)")
      .eq("id", ride_id)
      .single();

    if (rideError || !ride) {
      throw new Error("Ride not found");
    }

    const totalAmount = ride.fare + ride.service_fee;
    const amountInKobo = totalAmount * 100;

    const subaccountCode = ride.driver_profiles.paystack_subaccount_code;

    if (!subaccountCode) {
      throw new Error("Driver does not have a payment account configured");
    }

    const splitConfig = {
      subaccount: subaccountCode,
      share: (ride.fare - ride.service_fee) * 100,
    };

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountInKobo,
        metadata: {
          ride_id,
          service_fee: ride.service_fee * 100,
        },
        subaccount: subaccountCode,
        transaction_charge: ride.service_fee * 100,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to initialize payment");
    }

    const { error: transactionError } = await supabase
      .from("transactions")
      .insert({
        ride_id,
        passenger_id: ride.passenger_id,
        driver_id: ride.driver_id,
        amount: totalAmount,
        service_fee: ride.service_fee,
        driver_earnings: ride.fare - ride.service_fee,
        paystack_reference: data.data.reference,
        paystack_split_code: subaccountCode,
        status: "pending",
      });

    if (transactionError) {
      console.error("Error creating transaction record:", transactionError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
        reference: data.data.reference,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "An error occurred",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Your Google Apps Script endpoint (from the web app you deployed)
const GOOGLE_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz4Nt9BZSXMS1lYsA6rdu9sSIppuMxmhF6doONKj1cpPN8CCvRp4MJvpm3zAuzXQXL1ew/exec";

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body);
    const { name, email, course } = data;

    // STEP 1: Store booking in Google Sheet
    await fetch(GOOGLE_SCRIPT_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, course })
    });

    // STEP 2: Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { name: course },
            unit_amount: 26000 // £260 in pence (adjust as needed)
          },
          quantity: 1,
        },
      ],
      success_url: "https://centrelightstudios.co.uk/booking-success",
      cancel_url: "https://centrelightstudios.co.uk/booking-cancelled",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ id: session.id }),
    };

  } catch (err) {
    console.error("Checkout Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Something went wrong." }),
    };
  }
};

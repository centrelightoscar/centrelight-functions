const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const GOOGLE_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz4Nt9BZSXMS1lYsA6rdu9sSIppuMxmhF6doONKj1cpPN8CCvRp4MJvpm3zAuzXQXL1ew/exec";

exports.handler = async function(event, context) {
  console.log("🔁 HTTP Method:", event.httpMethod);
  console.log("📦 Incoming Data:", event.body);
  console.log("🔐 STRIPE KEY STARTS WITH:", process.env.STRIPE_SECRET_KEY?.slice(0, 10));

  // ✅ Handle CORS preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: "OK"
    };
  }

  // ✅ Handle invalid methods
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { name, email, course, price } = data;

    if (!name || !email || !course || !price) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS"
        },
        body: JSON.stringify({ error: "Missing booking details" })
      };
    }

    const unitAmount = Math.round(parseFloat(price) * 100);
    if (isNaN(unitAmount) || unitAmount <= 0) {
      throw new Error("Invalid price value.");
    }

    // Optional: log to Google Sheets
    await fetch(GOOGLE_SCRIPT_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, course, price })
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: { name: course },
            unit_amount: unitAmount
          },
          quantity: 1,
        },
      ],
      success_url: "https://centrelightstudios.co.uk/booking-success",
      cancel_url: "https://centrelightstudios.co.uk/booking-cancelled",
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify({ url: session.url }),
    };

  } catch (err) {
    console.error("Checkout Error:", err.message);
    console.error("Stack Trace:", err.stack);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify({ error: err.message || "Something went wrong." }),
    };
  }

};

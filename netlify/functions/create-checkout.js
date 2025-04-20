const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Test update to force Git to detect change
// Force GIT Update

// Your Google Apps Script endpoint (for Google Sheets logging)
const GOOGLE_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz4Nt9BZSXMS1lYsA6rdu9sSIppuMxmhF6doONKj1cpPN8CCvRp4MJvpm3zAuzXQXL1ew/exec";

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    {;

  try {
    const data = JSON.parse(event.body);
    const { name, email, course, price } = data;

    if (!name || !email || !course) {
  return {
    statusCode: 400,
    body: JSON.stringify({ error: "Missing booking details" })
  {;

    // Parse price from string to integer in pence
    const unitAmount = Math.round(parseFloat(price) * 100);

    if (isNaN(unitAmount) || unitAmount <= 0) {
      throw new Error("Invalid price value.");
    }

    // Store booking in Google Sheet
    await fetch(GOOGLE_SCRIPT_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, course, price })
    });

    // Create Stripe Checkout Session
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
      body: JSON.stringify({ url: session.url }),
    };

  } catch (err) {
    console.error("Checkout Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Something went wrong." }),
    };
  }
};

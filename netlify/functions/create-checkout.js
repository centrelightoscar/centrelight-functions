const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Google Apps Script endpoint for logging bookings
const GOOGLE_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz4Nt9BZSXMS1lYsA6rdu9sSIppuMxmhF6doONKj1cpPN8CCvRp4MJvpm3zAuzXQXL1ew/exec";
// Public CSV URL for courses
const COURSES_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ33otXyqqAtf2FTy2n98hJBdLeNp41YL7ubyT56CKrqF0z92_sWeptkLFrliEdRwvZRQoFlfve34yj/pub?output=csv";

exports.handler = async function(event, context) {
  console.log("=== Received Booking Request ===");
  console.log("Method:", event.httpMethod);
  console.log("Headers:", event.headers);
  console.log("Body:", event.body);
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const data = JSON.parse(event.body);
    const { name, email, course, location } = data;

    if (!name || !email || !course || !location) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing booking details" })
      };
    }

    // Fetch and parse CSV to get the price
    const csvResponse = await fetch(COURSES_CSV_URL);
    const csvText = await csvResponse.text();
    const rows = csvText.trim().split("\n").slice(1); // Skip header
    let matchedPrice = null;

    for (const row of rows) {
      const columns = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, ""));
      const [csvCourse, , , , csvLocation, csvPrice] = columns;
      if (csvCourse === course && csvLocation === location) {
        matchedPrice = csvPrice;
        break;
      }
    }

    if (!matchedPrice) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Course price not found." })
      };
    }

    const unitAmount = Math.round(parseFloat(matchedPrice) * 100);

    // Store booking in Google Sheet
    await fetch(GOOGLE_SCRIPT_WEB_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, course, location, price: matchedPrice })
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
      body: JSON.stringify({ url: session.url })
    };

  } catch (err) {
    console.error("Checkout Error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Something went wrong." })
    };
  }
};

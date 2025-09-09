import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());

// Allow only your Netlify frontend
app.use(cors({
  origin: "https://john.netlifly.app"
}));

// Your Pesapal credentials
const consumer_key = "0iuYEMnLcrsdTq7QqE6KXlhKiJ370RkK";
const consumer_secret = "IYonVjMfCTdaAf3ndL/18ys9F4o=";

// API base URL (Live)
const BASE_URL = "https://pay.pesapal.com/v3";

// === Get Pesapal Token ===
async function getToken() {
  const res = await fetch(`${BASE_URL}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ consumer_key, consumer_secret }),
  });
  const data = await res.json();
  if (!data.token) throw new Error("Failed to fetch token");
  return data.token;
}

// === Create Order ===
app.post("/create-order", async (req, res) => {
  try {
    const { amount, phone } = req.body;

    // ✅ Validations
    if (!amount || amount < 50) {
      return res.status(400).json({ error: "Amount must be at least 50 KES." });
    }
    const phoneRegex = /^254\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: "Phone must be in format 2547XXXXXXXX." });
    }

    // Get token
    const token = await getToken();

    // Build order payload
    const order = {
      id: Date.now().toString(), // unique order ID
      currency: "KES",
      amount,
      description: "Payment via Netlify site",
      callback_url: "https://john.netlifly.app/payment-success", // redirect after payment
      notification_id: "your-registered-ipn-id", // Replace with real IPN ID
      billing_address: {
        email_address: "customer@example.com", // optional
        phone_number: phone,
        country_code: "KE",
        first_name: "Customer",
        last_name: "User",
      },
    };

    // Send order to Pesapal
    const resp = await fetch(`${BASE_URL}/api/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(order),
    });

    const data = await resp.json();

    if (data.redirect_url) {
      res.json({ redirect_url: data.redirect_url });
    } else {
      res.status(500).json({ error: data });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// === Start Server ===
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
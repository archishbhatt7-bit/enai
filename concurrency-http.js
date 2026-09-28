import crypto from "crypto";

const JWT_SECRET = "x9f7a2c4e1b8d6f5a3c2b1e0d9f8a7c6b5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c";

function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now(), exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })).toString("base64url");
  const sig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${sig}`;
}

async function runTest() {
  console.log("Starting concurrency test against HTTP API...");
  const CONCURRENCY = 50;
  
  const promises = Array.from({ length: CONCURRENCY }).map(async (_, index) => {
    const phone = `99999999${index.toString().padStart(2, '0')}`;
    const token = generateToken({ phone });

    const payload = {
      razorpay_payment_id: "fake_payment",
      razorpay_order_id: "fake_order",
      razorpay_signature: "fake_sig",
      slug: "test-shop", // I will create this shop in the DB via another script if needed
      customerName: `Concurrent User ${index}`,
      serviceId: 1, 
      slotDate: "2026-12-31", 
      slotTime: "12:00",
      paymentType: "token"
    };

    try {
      const res = await fetch("http://localhost:3000/api/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { status: "error", error: data.error || data.details || JSON.stringify(data) };
      }
      return { status: "success", data };
    } catch (e) {
      return { status: "error", error: e.message };
    }
  });

  const results = await Promise.all(promises);

  const successes = results.filter(r => r.status === "success");
  const errors = results.filter(r => r.status === "error");

  console.log(`\n--- Results from ${CONCURRENCY} concurrent requests ---`);
  console.log(`✅ Successes (Bookings made): ${successes.length}`);
  
  const errorCounts = errors.reduce((acc, r) => {
    acc[r.error] = (acc[r.error] || 0) + 1;
    return acc;
  }, {});
  
  for (const [msg, count] of Object.entries(errorCounts)) {
    console.log(`❌ Rejected (${count} times): ${msg}`);
  }
}

runTest().catch(console.error);

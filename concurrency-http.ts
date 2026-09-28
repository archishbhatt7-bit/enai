import jwt from "jsonwebtoken";

const JWT_SECRET = "x9f7a2c4e1b8d6f5a3c2b1e0d9f8a7c6b5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c";

async function runTest() {
  console.log("Starting concurrency test against HTTP API...");
  const CONCURRENCY = 50;

  // We need 50 different phone numbers to avoid the "max 3 upcoming bookings per user" rule
  // Wait, let's look at the rule:
  // "upcomingBookings.filter(b => b.shopId === shop.id && b.slotDate === slotDate)"
  // "if (sameDayShopBookings.length >= 2) { return ... Maximum of 2 bookings per day per shop allowed. }"
  // So we MUST use different users, or else the rate limit will reject them before they even hit the concurrency lock.
  
  const promises = Array.from({ length: CONCURRENCY }).map(async (_, index) => {
    const phone = `99999999${index.toString().padStart(2, '0')}`;
    const token = jwt.sign({ phone }, JWT_SECRET, { expiresIn: "1h" });

    const payload = {
      razorpay_payment_id: "fake_payment",
      razorpay_order_id: "fake_order",
      razorpay_signature: "fake_sig",
      slug: "test-shop", // Needs to be a valid shop slug
      customerName: `Concurrent User ${index}`,
      serviceId: 1, // Needs to be a valid service ID
      slotDate: "2026-12-31", // Future date
      slotTime: "12:00",
      paymentType: "token"
    };

    try {
      const res = await fetch("http://localhost:3000/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        return { status: "error", error: data.error };
      }
      return { status: "success", data };
    } catch (e: any) {
      return { status: "error", error: e.message };
    }
  });

  const results = await Promise.all(promises);

  const successes = results.filter(r => r.status === "success");
  const errors = results.filter(r => r.status === "error");

  console.log(`\n--- Results from ${CONCURRENCY} concurrent requests ---`);
  console.log(`✅ Successes (Bookings made): ${successes.length}`);
  
  // Group errors by message
  const errorCounts = errors.reduce((acc: any, r: any) => {
    acc[r.error] = (acc[r.error] || 0) + 1;
    return acc;
  }, {});
  
  for (const [msg, count] of Object.entries(errorCounts)) {
    console.log(`❌ Rejected (${count} times): ${msg}`);
  }

  // Ideally, only N successes should happen, where N is the number of chairs.
  if (successes.length > 1) {
    console.log("\n🚨 BUG DETECTED: Multiple bookings created for the same slot! The DB lock is failing.");
  } else if (successes.length === 1) {
    console.log("\n🎉 CONCURRENCY SAFE: Exactly 1 booking succeeded and the rest were rejected safely.");
  } else {
    console.log("\n⚠️ TEST FAILED TO RUN PROPERLY: 0 bookings succeeded. Check setup.");
  }
}

runTest().catch(console.error);

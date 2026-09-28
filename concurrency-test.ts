import { db } from "./lib/db/src/index.js";
import { bookingsTable } from "./lib/db/src/schema/bookings.js";
import { assignChair } from "./artifacts/api-server/src/lib/slots.js";
import { eq } from "drizzle-orm";

async function runConcurrencyTest() {
  console.log("Starting concurrency test...");
  
  const shopId = 1; // Assuming shop 1 exists
  const numChairs = 1; // 1 chair to force a conflict
  const date = "2026-12-31"; // Future date
  const slotTime = "10:00";
  const slotEndTime = "10:30";

  // 1. Clean up any existing bookings for this test slot
  await db.delete(bookingsTable).where(eq(bookingsTable.slotDate, date));
  console.log("Cleaned up existing bookings for test date.");

  // 2. Simulate 50 concurrent booking attempts
  const attempts = Array.from({ length: 50 }).map(async (_, index) => {
    try {
      await db.transaction(async (tx) => {
        // This is exactly what the actual code does
        const chairNumber = await assignChair(tx, shopId, numChairs, date, slotTime, slotEndTime);
        
        if (chairNumber === null) {
          throw new Error("NO_CHAIRS_AVAILABLE");
        }

        // Insert if a chair was found
        await tx.insert(bookingsTable).values({
          shopId: shopId,
          serviceId: 1, // Assuming service 1 exists
          customerName: `Test ${index}`,
          customerPhone: `99999999${index.toString().padStart(2, '0')}`,
          slotDate: date,
          slotTime: slotTime,
          slotEndTime: slotEndTime,
          chairNumber: chairNumber,
          totalAmount: 100,
        });
      });
      return "SUCCESS";
    } catch (e: any) {
      if (e.message === "NO_CHAIRS_AVAILABLE") {
        return "NO_CHAIRS";
      }
      return `ERROR: ${e.message}`;
    }
  });

  const results = await Promise.all(attempts);
  
  const successes = results.filter(r => r === "SUCCESS").length;
  const noChairs = results.filter(r => r === "NO_CHAIRS").length;
  const errors = results.filter(r => r.startsWith("ERROR")).length;

  console.log(`\nResults from 50 concurrent requests:`);
  console.log(`Successes (Bookings made): ${successes}`);
  console.log(`No Chairs Available: ${noChairs}`);
  console.log(`Errors: ${errors}`);

  if (successes > numChairs) {
    console.log(`\n❌ BUG DETECTED: Double booking occurred! ${successes} bookings made for only ${numChairs} chair.`);
  } else if (successes === numChairs) {
    console.log(`\n✅ CONCURRENCY SAFE: Exactly ${numChairs} booking made.`);
  }

  process.exit(0);
}

runConcurrencyTest().catch(console.error);

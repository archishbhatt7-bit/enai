import { db } from "@workspace/db";
import { bookingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const BUFFER_MINUTES = 10;
const ADVANCE_BOOKING_HOURS = 2;
const SLOT_INTERVAL_MINUTES = 30;

export interface SlotInfo {
  time: string;
  available: boolean;
  availableChairs: number;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addMinutes(time: string, minutes: number): string {
  return minutesToTime(timeToMinutes(time) + minutes);
}

export async function getAvailableSlots(
  shopId: number,
  numChairs: number,
  date: string,
  serviceDuration: number,
  openTime: string,
  closeTime: string,
): Promise<SlotInfo[]> {
  const totalDuration = serviceDuration + BUFFER_MINUTES;

  // Get all bookings for this shop on this date that are not cancelled/no-show
  const existingBookings = await db
    .select()
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.shopId, shopId),
        eq(bookingsTable.slotDate, date),
      )
    );

  const activeBookings = existingBookings.filter(
    (b) => !["cancelled", "no_show"].includes(b.status)
  );

  const openMinutes = timeToMinutes(openTime);
  const closeMinutes = timeToMinutes(closeTime);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayStr = now.toISOString().split("T")[0];
  const isToday = date === todayStr;
  const advanceMinutes = ADVANCE_BOOKING_HOURS * 60;

  const slots: SlotInfo[] = [];
  let slotStart = openMinutes;

  while (slotStart + totalDuration <= closeMinutes) {
    const slotEnd = slotStart + totalDuration;
    const slotTime = minutesToTime(slotStart);

    // Check advance booking rule (2 hours in advance)
    if (isToday && slotStart < nowMinutes + advanceMinutes) {
      slotStart += SLOT_INTERVAL_MINUTES;
      continue;
    }

    // Count chairs occupied during this slot window
    let chairsOccupied = 0;
    for (const booking of activeBookings) {
      const bookingStart = timeToMinutes(booking.slotTime);
      const bookingEnd = timeToMinutes(booking.slotEndTime);
      // Overlap check
      if (slotStart < bookingEnd && slotEnd > bookingStart) {
        chairsOccupied++;
      }
    }

    const availableChairs = numChairs - chairsOccupied;
    slots.push({
      time: slotTime,
      available: availableChairs > 0,
      availableChairs: Math.max(0, availableChairs),
    });

    slotStart += SLOT_INTERVAL_MINUTES;
  }

  return slots;
}

export async function assignChair(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accepts db instance or transaction
  dbOrTx: any,
  shopId: number,
  numChairs: number,
  date: string,
  slotTime: string,
  slotEndTime: string,
): Promise<number | null> {
  const existingBookings = await dbOrTx
    .select()
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.shopId, shopId),
        eq(bookingsTable.slotDate, date),
      )
    );

  const activeBookings = existingBookings.filter(
    (b) => !["cancelled", "no_show"].includes(b.status)
  );

  const slotStartMins = timeToMinutes(slotTime);
  const slotEndMins = timeToMinutes(slotEndTime);
  const occupiedChairs = new Set<number>();

  for (const booking of activeBookings) {
    const bookingStart = timeToMinutes(booking.slotTime);
    const bookingEnd = timeToMinutes(booking.slotEndTime);
    if (slotStartMins < bookingEnd && slotEndMins > bookingStart) {
      occupiedChairs.add(booking.chairNumber);
    }
  }

  for (let chair = 1; chair <= numChairs; chair++) {
    if (!occupiedChairs.has(chair)) return chair;
  }

  return null;
}

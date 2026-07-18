/**
 * SMS & OTP Provider Abstraction
 * 
 * This file handles sending SMS/OTPs. By keeping it abstracted here,
 * we can easily swap providers (like MSG91, Twilio, etc.) in the future
 * without modifying our core route logic.
 */

// Toggle this when you have real MSG91 credentials
const USE_REAL_PROVIDER = false;

// MSG91 Configuration (Placeholders for future use)
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || "";
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || "";

/**
 * Sends an OTP via SMS to the specified phone number.
 * 
 * @param phone The 10-digit phone number.
 * @param otp The 6-digit OTP code to send.
 */
export async function sendOtpSms(phone: string, otp: string): Promise<void> {
  if (USE_REAL_PROVIDER) {
    // --- MSG91 INTEGRATION ---
    // try {
    //   const response = await fetch(`https://control.msg91.com/api/v5/otp?authkey=${MSG91_AUTH_KEY}&template_id=${MSG91_TEMPLATE_ID}&mobile=91${phone}&otp=${otp}`, {
    //     method: 'POST'
    //   });
    //   if (!response.ok) throw new Error("MSG91 API Failed");
    //   return;
    // } catch (err) {
    //   console.error("Failed to send MSG91 OTP:", err);
    //   throw err;
    // }
  } else {
    // --- DEMO / LOCAL MODE ---
    // In demo mode, we just log the OTP to the console.
    console.log(`\n==========================================`);
    console.log(`[SMS MOCK] 📱 Sending OTP to +91 ${phone}`);
    console.log(`[SMS MOCK] 🔑 Your OTP is: ${otp}`);
    console.log(`==========================================\n`);
    
    // Simulate network delay
    return new Promise((resolve) => setTimeout(resolve, 500));
  }
}

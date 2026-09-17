import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import Footer from "@/components/Footer";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-slate-900 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-slate-600 mb-3">{children}</p>;
}

function UL({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm text-slate-600 mb-3">
      {items.map((item, i) => (
        <li key={i} className="leading-relaxed">{item}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPolicy() {
  useEffect(() => { document.title = "Privacy Policy | eNai"; }, []);

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col">
      <header className="px-6 py-5 sm:px-10 max-w-7xl mx-auto w-full">
        <Link href="/"><BrandMark withWordmark className="text-xl" /></Link>
      </header>

      <main className="flex-1 px-6 sm:px-10 max-w-3xl mx-auto w-full pb-20">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mt-2 mb-10">Last updated: September 17, 2026</p>

        <Section title="1. Introduction">
          <P>
            eNai ("we", "us", or "our") operates the eNai barbershop booking platform accessible at enai-barber-booking.vercel.app. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our platform.
          </P>
          <P>
            By using eNai, you consent to the data practices described in this policy.
          </P>
        </Section>

        <Section title="2. Information We Collect">
          <P>We collect the following types of information:</P>
          <P><strong>Information you provide directly:</strong></P>
          <UL items={[
            "Phone number — used for OTP-based authentication",
            "Name — if provided during booking",
            "Booking details — service selected, date, time, and shop",
          ]} />
          <P><strong>Information collected automatically:</strong></P>
          <UL items={[
            "Device location — only when you grant permission, used to sort shops by proximity",
            "Device and browser information — for analytics and improving user experience",
            "Usage data — pages visited, features used, and interaction patterns",
          ]} />
        </Section>

        <Section title="3. How We Use Your Information">
          <P>We use the information we collect to:</P>
          <UL items={[
            "Authenticate your identity via OTP verification",
            "Process and manage your bookings",
            "Display shops sorted by proximity to your location",
            "Send booking confirmations and reminders",
            "Improve our platform and user experience",
            "Prevent fraud and ensure platform security",
          ]} />
        </Section>

        <Section title="4. Third-Party Services">
          <P>We use the following third-party services to operate eNai:</P>
          <UL items={[
            "MSG91 — for sending OTP messages for phone verification",
            "Razorpay — for processing the ₹5 platform fee payment securely",
            "Google Cloud Storage — for storing shop photos uploaded by shop owners",
            "Vercel — for hosting the platform",
          ]} />
          <P>
            Each of these services has its own privacy policy governing how they handle data. We only share the minimum information necessary for each service to function.
          </P>
        </Section>

        <Section title="5. Cookies & Local Storage">
          <P>
            eNai does not use tracking cookies. We use your browser's localStorage to store:
          </P>
          <UL items={[
            "Authentication tokens — to keep you logged in between visits",
            "Favourite shops — to remember your starred shops locally on your device",
          ]} />
          <P>
            This data stays on your device and is not transmitted to any third party.
          </P>
        </Section>

        <Section title="6. Data Storage & Security">
          <P>
            Your data is stored in a secured PostgreSQL database. Authentication tokens are signed using industry-standard JWT with HMAC-SHA256. Payment verification uses Razorpay's cryptographic signature verification to ensure transaction integrity.
          </P>
          <P>
            We do not store your payment card details. All payment processing is handled securely by Razorpay.
          </P>
        </Section>

        <Section title="7. Data Retention">
          <P>
            We retain your personal information for as long as your account is active or as needed to provide our services. Booking history is retained for operational and dispute resolution purposes. You may request deletion of your data at any time by contacting us.
          </P>
        </Section>

        <Section title="8. Your Rights">
          <P>You have the right to:</P>
          <UL items={[
            "Access the personal data we hold about you",
            "Request correction of inaccurate information",
            "Request deletion of your personal data",
            "Withdraw consent for location access at any time via your browser settings",
          ]} />
          <P>
            To exercise any of these rights, contact us at{" "}
            <a href="mailto:trustenai.in@gmail.com" className="text-[#b85434] font-semibold hover:underline">trustenai.in@gmail.com</a>.
          </P>
        </Section>

        <Section title="9. Children's Privacy">
          <P>
            eNai is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us so we can take appropriate action.
          </P>
        </Section>

        <Section title="10. Changes to This Policy">
          <P>
            We may update this Privacy Policy from time to time. When we do, we will revise the "Last updated" date at the top of this page. Continued use of eNai after changes constitutes acceptance of the updated policy.
          </P>
        </Section>

        <Section title="11. Contact Us">
          <P>
            If you have questions about this Privacy Policy or your personal data, please contact us:
          </P>
          <P>
            <strong>Email:</strong>{" "}
            <a href="mailto:trustenai.in@gmail.com" className="text-[#b85434] font-semibold hover:underline">trustenai.in@gmail.com</a>
          </P>
        </Section>
      </main>

      <Footer />
    </div>
  );
}

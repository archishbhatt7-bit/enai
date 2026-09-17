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

export default function TermsAndConditions() {
  useEffect(() => { document.title = "Terms & Conditions | eNai"; }, []);

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col">
      <header className="px-6 py-5 sm:px-10 max-w-7xl mx-auto w-full">
        <Link href="/"><BrandMark withWordmark className="text-xl" /></Link>
      </header>

      <main className="flex-1 px-6 sm:px-10 max-w-3xl mx-auto w-full pb-20">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Terms &amp; Conditions</h1>
        <p className="text-sm text-slate-400 mt-2 mb-10">Last updated: September 17, 2026</p>

        <Section title="1. Acceptance of Terms">
          <P>
            By accessing or using the eNai platform ("Platform"), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use the Platform.
          </P>
        </Section>

        <Section title="2. Description of Service">
          <P>
            eNai is an online marketplace that connects customers with local barbershops. We provide a platform for discovering shops, browsing services and pricing, and reserving time slots. eNai is not a barbershop and does not provide grooming services directly.
          </P>
          <P>
            The actual grooming services are provided by independent shop owners who list their businesses on eNai. We act solely as an intermediary to facilitate bookings.
          </P>
        </Section>

        <Section title="3. User Accounts">
          <P><strong>Customers</strong> authenticate using their phone number via OTP verification. By providing your phone number, you confirm it is yours and that you are authorised to use it.</P>
          <P><strong>Shop Owners</strong> register with a phone number and password. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account.</P>
        </Section>

        <Section title="4. Bookings & Payments">
          <P>
            When you book a service through eNai, a non-refundable platform fee of <strong>₹5</strong> is charged via Razorpay. This fee covers the reservation of your time slot and platform operating costs.
          </P>
          <P>
            The service price (haircut, shave, etc.) is paid directly to the shop at the time of your visit — either in cash or via UPI. eNai does not collect, hold, or process the service payment.
          </P>
          <P>
            Upon successful booking, you receive a 4-digit arrival OTP. Present this OTP to the shop to confirm your arrival.
          </P>
        </Section>

        <Section title="5. Cancellations & No-Shows">
          <P>
            You may cancel a booking before the scheduled time. The ₹5 platform fee is non-refundable regardless of cancellation. Please refer to our <Link href="/refund" className="text-[#b85434] font-semibold hover:underline">Refund Policy</Link> for details.
          </P>
          <P>
            If you do not show up for a confirmed booking ("no-show"), the shop may mark your booking accordingly. Repeated no-shows may result in temporary restrictions on your ability to book.
          </P>
        </Section>

        <Section title="6. Shop Owner Responsibilities">
          <P>Shop owners who list their businesses on eNai agree to:</P>
          <UL items={[
            "Provide accurate and up-to-date information about services, pricing, and availability",
            "Honour confirmed bookings and provide the services as listed",
            "Maintain hygiene and professional standards at their establishment",
            "Comply with all applicable local laws and regulations",
          ]} />
        </Section>

        <Section title="7. Prohibited Conduct">
          <P>You agree not to:</P>
          <UL items={[
            "Use the Platform for any unlawful purpose",
            "Provide false or misleading information",
            "Attempt to gain unauthorised access to the Platform or other users' accounts",
            "Interfere with the proper functioning of the Platform",
            "Abuse, harass, or discriminate against other users or shop owners",
            "Scrape, crawl, or use automated tools to access the Platform without permission",
          ]} />
        </Section>

        <Section title="8. Intellectual Property">
          <P>
            The eNai name, logo, brand mark, and all associated visual design, software, and content are the intellectual property of eNai. You may not copy, modify, distribute, or create derivative works from any part of the Platform without prior written permission.
          </P>
        </Section>

        <Section title="9. Disclaimer of Warranties">
          <P>
            eNai is provided on an "as is" and "as available" basis. We make no warranties, express or implied, regarding the availability, reliability, or accuracy of the Platform. We do not guarantee that any shop listed on eNai will meet your expectations.
          </P>
        </Section>

        <Section title="10. Limitation of Liability">
          <P>
            To the maximum extent permitted by law, eNai shall not be liable for any indirect, incidental, consequential, or punitive damages arising from your use of the Platform, including but not limited to loss of profits, data, or goodwill.
          </P>
          <P>
            Our total liability for any claim related to the Platform shall not exceed the amount you paid to eNai in the twelve (12) months preceding the claim.
          </P>
        </Section>

        <Section title="11. Governing Law">
          <P>
            These Terms are governed by and construed in accordance with the laws of India. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts in Madhya Pradesh, India.
          </P>
        </Section>

        <Section title="12. Changes to These Terms">
          <P>
            We may revise these Terms at any time by updating this page. The "Last updated" date at the top indicates when the latest changes were made. Continued use of the Platform after changes constitutes acceptance of the revised Terms.
          </P>
        </Section>

        <Section title="13. Contact Us">
          <P>
            For questions about these Terms, contact us at{" "}
            <a href="mailto:trustenai.in@gmail.com" className="text-[#b85434] font-semibold hover:underline">trustenai.in@gmail.com</a>.
          </P>
        </Section>
      </main>

      <Footer />
    </div>
  );
}

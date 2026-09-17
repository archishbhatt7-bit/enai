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

export default function RefundPolicy() {
  useEffect(() => { document.title = "Refund Policy | eNai"; }, []);

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col">
      <header className="px-6 py-5 sm:px-10 max-w-7xl mx-auto w-full">
        <Link href="/"><BrandMark withWordmark className="text-xl" /></Link>
      </header>

      <main className="flex-1 px-6 sm:px-10 max-w-3xl mx-auto w-full pb-20">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Refund Policy</h1>
        <p className="text-sm text-slate-400 mt-2 mb-10">Last updated: September 17, 2026</p>

        {/* Quick summary box */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-10">
          <h2 className="text-base font-bold text-slate-900 mb-2">Quick Summary</h2>
          <P>
            When you book through eNai, you pay a <strong>₹5 platform fee</strong> online. This fee is <strong>non-refundable</strong>. The actual service price (haircut, shave, etc.) is paid directly to the barber at the shop — eNai does not collect or control that payment.
          </P>
        </div>

        <Section title="1. Platform Fee (₹5)">
          <P>
            The ₹5 platform fee is charged at the time of booking to reserve your time slot. This fee covers:
          </P>
          <UL items={[
            "Reservation of your preferred time slot",
            "Generation of your unique 4-digit arrival OTP",
            "Platform infrastructure and operational costs",
          ]} />
          <P>
            <strong>This fee is non-refundable</strong>, including in cases of cancellation, no-show, or change of mind.
          </P>
        </Section>

        <Section title="2. Service Payments">
          <P>
            The price of the grooming service itself (as listed on the shop's page) is paid directly to the barber at the time of your visit. This payment is typically made in cash or via UPI.
          </P>
          <P>
            Since eNai does not collect the service payment, any disputes regarding service quality, overcharging, or refunds for the service itself must be resolved directly with the shop owner.
          </P>
        </Section>

        <Section title="3. Exceptional Circumstances">
          <P>
            We may consider a refund of the ₹5 platform fee in the following exceptional cases:
          </P>
          <UL items={[
            "The shop was permanently closed on your booked date without prior notice on the platform",
            "A verified technical error on eNai prevented you from using your booking (e.g., duplicate charge, system error)",
            "The shop owner cancelled your booking from their dashboard",
          ]} />
          <P>
            Refunds for exceptional circumstances are reviewed on a case-by-case basis and are at eNai's sole discretion.
          </P>
        </Section>

        <Section title="4. How to Request a Refund">
          <P>
            If you believe you qualify for a refund under the exceptional circumstances listed above, please email us with the following details:
          </P>
          <UL items={[
            "Your registered phone number",
            "Shop name and booking date/time",
            "A brief description of the issue",
          ]} />
          <P>
            Send your request to{" "}
            <a href="mailto:trustenai.in@gmail.com" className="text-[#b85434] font-semibold hover:underline">trustenai.in@gmail.com</a>.
          </P>
        </Section>

        <Section title="5. Refund Processing">
          <P>
            If a refund is approved, it will be processed within <strong>5–7 business days</strong> and credited back to the original payment method used during booking (via Razorpay).
          </P>
        </Section>

        <Section title="6. Changes to This Policy">
          <P>
            We may update this Refund Policy from time to time. Changes will be reflected on this page with an updated "Last updated" date. Continued use of eNai after changes constitutes acceptance of the revised policy.
          </P>
        </Section>

        <Section title="7. Contact Us">
          <P>
            For any refund-related queries, reach out to us at{" "}
            <a href="mailto:trustenai.in@gmail.com" className="text-[#b85434] font-semibold hover:underline">trustenai.in@gmail.com</a>.
          </P>
        </Section>
      </main>

      <Footer />
    </div>
  );
}

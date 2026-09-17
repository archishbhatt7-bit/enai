import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Check, IndianRupee } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import Footer from "@/components/Footer";

const customerFeatures = [
  "Browse shops, services & prices for free",
  "₹5 platform fee per booking",
  "Secure payment via Razorpay",
  "4-digit arrival OTP for each booking",
  "View and manage your bookings",
  "Sort shops by distance and price",
];

const ownerFeatures = [
  "List your shop for free",
  "No commission on services",
  "Manage services, prices & schedule",
  "Real-time booking dashboard",
  "Revenue tracking & activity log",
  "Upload photos & portfolio",
];

export default function Pricing() {
  useEffect(() => { document.title = "Pricing | eNai"; }, []);

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col">
      <header className="px-6 py-5 sm:px-10 max-w-7xl mx-auto w-full">
        <Link href="/"><BrandMark withWordmark className="text-xl" /></Link>
      </header>

      <main className="flex-1 px-6 sm:px-10 max-w-5xl mx-auto w-full pb-20">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Simple, transparent pricing</h1>
          <p className="mt-4 text-base text-slate-500 font-medium">
            No hidden fees. Customers pay a small platform fee per booking. Shop owners list for free.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto mb-16">
          {/* Customer card */}
          <div className="bg-white border-2 border-[#E8900C] rounded-2xl p-7 relative">
            <span className="absolute -top-3 left-6 bg-[#E8900C] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
              For Customers
            </span>
            <div className="mt-2 mb-5">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-slate-900">₹5</span>
                <span className="text-sm font-semibold text-slate-400">per booking</span>
              </div>
              <p className="text-sm text-slate-500 mt-2">
                One-time platform fee to reserve your slot. Service price is paid directly to the barber.
              </p>
            </div>
            <ul className="space-y-2.5">
              {customerFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Shop owner card */}
          <div className="bg-[#24201d] rounded-2xl p-7 relative">
            <span className="absolute -top-3 left-6 bg-[#f7f2eb] text-[#24201d] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
              For Shop Owners
            </span>
            <div className="mt-2 mb-5">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-[#f7f2eb]">Free</span>
              </div>
              <p className="text-sm text-[#a1968d] mt-2">
                List your shop, manage bookings, and grow your business — completely free.
              </p>
            </div>
            <ul className="space-y-2.5">
              {ownerFeatures.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-[#cfc4ba]">
                  <Check className="w-4 h-4 text-[#E8900C] shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* How payment works */}
        <section className="max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">How payment works</h2>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8">
            <div className="space-y-4 text-sm text-slate-600">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-[#E8900C]/10 flex items-center justify-center shrink-0">
                  <IndianRupee className="w-4 h-4 text-[#E8900C]" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">₹5 platform fee (paid online via Razorpay)</p>
                  <p className="text-slate-500 mt-0.5">Charged when you confirm a booking. Covers your slot reservation and platform costs. This fee is non-refundable.</p>
                </div>
              </div>
              <div className="border-t border-slate-100" />
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <IndianRupee className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Service price (paid at the shop)</p>
                  <p className="text-slate-500 mt-0.5">The cost of your haircut, shave, or other service is paid directly to the barber — in cash or UPI. eNai does not handle this payment.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">Frequently asked questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "Why is there a ₹5 fee?",
                a: "The platform fee covers the cost of reserving your time slot, sending OTP confirmations, and maintaining the platform. It ensures that bookings are genuine and reduces no-shows.",
              },
              {
                q: "Can I get a refund on the ₹5 fee?",
                a: "The platform fee is non-refundable under normal circumstances. See our Refund Policy for details on exceptional cases.",
              },
              {
                q: "Do shop owners pay anything?",
                a: "No. Listing your shop, managing bookings, and using the dashboard are completely free. We don't charge any commission on your services.",
              },
              {
                q: "Are service prices set by eNai?",
                a: "No. Each shop sets its own prices for services. eNai simply displays them so customers can compare before booking.",
              },
            ].map((item) => (
              <div key={item.q} className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-1.5">{item.q}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

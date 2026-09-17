import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Search, CalendarCheck, Scissors } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import Footer from "@/components/Footer";

const steps = [
  {
    icon: Search,
    title: "Find",
    description: "Search for barbershops in your city. Browse services, check prices, and see live availability — all before you leave home.",
  },
  {
    icon: CalendarCheck,
    title: "Book",
    description: "Pick a service, choose your time slot, and pay a ₹5 platform fee to lock in your reservation. You'll get a 4-digit arrival OTP.",
  },
  {
    icon: Scissors,
    title: "Walk In",
    description: "Show up at your reserved time, share your OTP with the barber, and get served — no waiting in line.",
  },
];

export default function About() {
  useEffect(() => { document.title = "About Us | eNai"; }, []);

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col">
      <header className="px-6 py-5 sm:px-10 max-w-7xl mx-auto w-full">
        <Link href="/"><BrandMark withWordmark className="text-xl" /></Link>
      </header>

      <main className="flex-1 px-6 sm:px-10 max-w-5xl mx-auto w-full pb-20">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        {/* Hero */}
        <div className="max-w-2xl mb-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
            Your barber, <span className="text-[#E8900C]">your time.</span>
          </h1>
          <p className="mt-5 text-lg text-slate-500 font-medium leading-relaxed max-w-xl">
            eNai is a barbershop discovery and booking platform built for India. We help customers skip the queue and help barbers fill their chairs — no more walk-in guesswork.
          </p>
        </div>

        {/* How it works */}
        <section className="mb-16">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {steps.map((step, i) => (
              <div key={step.title} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:border-[#E8900C]/40 transition-all">
                <div className="w-12 h-12 rounded-xl bg-[#E8900C]/10 flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6 text-[#E8900C]" />
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-black text-[#E8900C] uppercase tracking-widest">Step {i + 1}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* For shop owners */}
        <section className="mb-16">
          <div className="bg-[#24201d] rounded-2xl p-8 sm:p-10">
            <h2 className="text-xs font-bold text-[#a1968d] uppercase tracking-widest mb-4">For shop owners</h2>
            <h3 className="text-2xl font-bold text-[#f7f2eb] mb-4">Run your shop smarter</h3>
            <p className="text-sm text-[#cfc4ba] leading-relaxed max-w-xl mb-6">
              List your shop on eNai for free. Manage your services, set your own schedule, track bookings and revenue — all from a single dashboard. Your customers book ahead, you fill your chairs.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-[#E8900C] hover:bg-[#d4820a] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors"
            >
              Register your shop
            </Link>
          </div>
        </section>

        {/* Mission */}
        <section className="mb-16 max-w-2xl">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Our mission</h2>
          <p className="text-lg text-slate-700 font-medium leading-relaxed">
            We believe no one should waste their afternoon sitting in a crowded shop hoping for a chair. eNai exists to make barbershop visits predictable, efficient, and fair — for both the customer who values their time and the barber who wants a full book.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}

import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowLeft, Mail, Clock, MapPin } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import Footer from "@/components/Footer";

export default function Contact() {
  useEffect(() => { document.title = "Contact Us | eNai"; }, []);

  return (
    <div className="min-h-screen bg-[#faf8f5] flex flex-col">
      <header className="px-6 py-5 sm:px-10 max-w-7xl mx-auto w-full">
        <Link href="/"><BrandMark withWordmark className="text-xl" /></Link>
      </header>

      <main className="flex-1 px-6 sm:px-10 max-w-3xl mx-auto w-full pb-20">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">Contact Us</h1>
        <p className="text-base text-slate-500 font-medium mt-3 mb-10 max-w-lg">
          Have a question, feedback, or need help with a booking? We'd love to hear from you.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
          {/* Email card */}
          <a
            href="mailto:trustenai.in@gmail.com"
            className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:border-[#E8900C]/40 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-[#E8900C]/10 flex items-center justify-center mb-4 group-hover:bg-[#E8900C]/20 transition-colors">
              <Mail className="w-6 h-6 text-[#E8900C]" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Email Us</h2>
            <p className="text-sm text-[#b85434] font-semibold">trustenai.in@gmail.com</p>
          </a>

          {/* Response time card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 text-slate-500" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Response Time</h2>
            <p className="text-sm text-slate-500">We typically respond within 24–48 hours on business days.</p>
          </div>
        </div>

        {/* What to include */}
        <section className="mb-12">
          <h2 className="text-lg font-bold text-slate-900 mb-3">When contacting us, please include:</h2>
          <ul className="list-disc list-outside pl-5 space-y-1.5 text-sm text-slate-600">
            <li className="leading-relaxed">Your registered phone number (if you have an account)</li>
            <li className="leading-relaxed">Shop name and booking details (if related to a booking)</li>
            <li className="leading-relaxed">A clear description of your question or issue</li>
          </ul>
        </section>

        {/* Location */}
        <section className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-slate-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 mb-1">Business Location</h2>
              <p className="text-sm text-slate-500">Nagda, Madhya Pradesh, India</p>
              <p className="text-xs text-slate-400 mt-1">eNai is an online platform — all support is handled via email.</p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
